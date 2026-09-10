use anchor_lang::prelude::*;

use crate::{VaultError, VaultState};

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [b"vault_state", user.key().as_ref()],
        bump,
        constraint = vault_state.owner == user.key() @ VaultError::Unauthorized
    )]
    pub vault_state: Account<'info, VaultState>,

    /// CHECK:
    /// Validated by PDA seeds and the stored vault_asset address.
    #[account(
        mut,
        address = vault_state.vault_asset,
        seeds = [b"vault_asset", user.key().as_ref()],
        bump
    )]
    pub vault_asset: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> Deposit<'info> {
    pub fn deposit(&self, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::InvalidAmount);

        let accounts = anchor_lang::system_program::Transfer {
            from: self.user.to_account_info(),
            to: self.vault_asset.to_account_info(),
        };

        anchor_lang::system_program::transfer(
            CpiContext::new(self.system_program.to_account_info(), accounts),
            amount,
        )
    }
}
