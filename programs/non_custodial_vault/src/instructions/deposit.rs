use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{NonCustodialVaultError, VaultState};

#[derive(Accounts)]
pub struct Deposit<'info> {
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

impl<'info> Deposit<'info> {
    pub fn deposit(&mut self, amount: u64) -> Result<()> {
        require!(amount > 0, NonCustodialVaultError::InvalidAmount);

        let shares = if self.vault_state.total_assets == 0 {
            amount
        } else {
            amount
                .checked_mul(self.vault_state.total_shares)
                .ok_or(NonCustodialVaultError::ArithmeticOverflow)?
                .checked_div(self.vault_state.total_assets)
                .ok_or(NonCustodialVaultError::ArithmeticOverflow)?
        };

        require!(shares > 0, NonCustodialVaultError::InvalidAmount);

        token::transfer(
            CpiContext::new(
                self.token_program.to_account_info(),
                Transfer {
                    from: self.user_position.to_account_info(),
                    to: self.vault_position.to_account_info(),
                    authority: self.user.to_account_info(),
                },
            ),
            amount,
        )?;

        self.vault_state.total_assets = self
            .vault_state
            .total_assets
            .checked_add(amount)
            .ok_or(NonCustodialVaultError::ArithmeticOverflow)?;

        self.vault_state.total_shares = self
            .vault_state
            .total_shares
            .checked_add(shares)
            .ok_or(NonCustodialVaultError::ArithmeticOverflow)?;

        Ok(())
    }
}
