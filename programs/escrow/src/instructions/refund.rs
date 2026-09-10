use anchor_lang::prelude::*;

use anchor_spl::token_interface::{
    close_account, transfer_checked, CloseAccount, Mint, TokenAccount, TokenInterface,
    TransferChecked,
};

use crate::{constants::ESCROW_SEED, error::EscrowError, Escrow};

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(
        mut,
        close = maker,
        seeds = [
            ESCROW_SEED,
            maker.key().as_ref(),
            escrow.seed.to_le_bytes().as_ref()
        ],
        bump = escrow.bump,
        has_one = maker @ EscrowError::InvalidMaker,
        has_one = mint_a @ EscrowError::InvalidMintA
    )]
    pub escrow: Account<'info, Escrow>,

    pub mint_a: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = maker,
        associated_token::token_program = token_program
    )]
    pub maker_ata_a: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = escrow,
        associated_token::token_program = token_program
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

impl<'info> Refund<'info> {
    pub fn refund(&mut self, current_time: i64) -> Result<()> {
        if self.escrow.expiration != 0 {
            require!(
                current_time >= self.escrow.expiration,
                EscrowError::EscrowStillActive
            );
        }

        let seed_bytes = self.escrow.seed.to_le_bytes();
        let maker_key = self.maker.key();

        let signer_seeds: &[&[&[u8]]] = &[&[
            ESCROW_SEED,
            maker_key.as_ref(),
            seed_bytes.as_ref(),
            &[self.escrow.bump],
        ]];

        let amount = self.vault.amount;

        if amount > 0 {
            transfer_checked(
                CpiContext::new_with_signer(
                    self.token_program.to_account_info(),
                    TransferChecked {
                        from: self.vault.to_account_info(),
                        mint: self.mint_a.to_account_info(),
                        to: self.maker_ata_a.to_account_info(),
                        authority: self.escrow.to_account_info(),
                    },
                    signer_seeds,
                ),
                amount,
                self.mint_a.decimals,
            )?;
        }

        close_account(CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            CloseAccount {
                account: self.vault.to_account_info(),
                destination: self.maker.to_account_info(),
                authority: self.escrow.to_account_info(),
            },
            signer_seeds,
        ))?;

        Ok(())
    }
}
