use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{NonCustodialVaultError, VaultState};

#[derive(Accounts)]
pub struct Redeem<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", vault_state.authority.as_ref()],
        bump = vault_state.bump
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(
        mut,
        constraint = user_position.mint == vault_state.position_mint
    )]
    pub user_position: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = vault_position.mint == vault_state.position_mint
    )]
    pub vault_position: Account<'info, TokenAccount>,

    pub position_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

impl<'info> Redeem<'info> {
    pub fn redeem(&mut self, shares: u64) -> Result<()> {
        require!(shares > 0, NonCustodialVaultError::InvalidAmount);

        require!(
            shares <= self.vault_state.total_shares,
            NonCustodialVaultError::InsufficientShares
        );

        let assets = shares
            .checked_mul(self.vault_state.total_assets)
            .ok_or(NonCustodialVaultError::ArithmeticOverflow)?
            .checked_div(self.vault_state.total_shares)
            .ok_or(NonCustodialVaultError::ArithmeticOverflow)?;

        require!(
            assets <= self.vault_position.amount,
            NonCustodialVaultError::InsufficientAssets
        );

        let authority_key = self.vault_state.authority;

        let signer_seeds: &[&[&[u8]]] =
            &[&[b"vault", authority_key.as_ref(), &[self.vault_state.bump]]];

        token::transfer(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                Transfer {
                    from: self.vault_position.to_account_info(),
                    to: self.user_position.to_account_info(),
                    authority: self.vault_state.to_account_info(),
                },
                signer_seeds,
            ),
            assets,
        )?;

        self.vault_state.total_assets -= assets;
        self.vault_state.total_shares -= shares;

        Ok(())
    }
}
