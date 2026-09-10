use anchor_lang::prelude::*;

use crate::{VaultError, VaultState};

#[derive(Accounts)]
pub struct Close<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        close = user,
        seeds = [b"vault_state", user.key().as_ref()],
        bump,
        constraint = vault_state.owner == user.key() @ VaultError::Unauthorized
    )]
    pub vault_state: Account<'info, VaultState>,

    /// CHECK:
    /// Validated by PDA seeds and stored address.
    #[account(
        mut,
        address = vault_state.vault_asset,
        seeds = [b"vault_asset", user.key().as_ref()],
        bump
    )]
    pub vault_asset: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> Close<'info> {
    pub fn close(&self, bump: u8) -> Result<()> {
        let amount = self.vault_asset.lamports();

        if amount > 0 {
            let user_key = self.user.key();

            let signer_seeds: &[&[&[u8]]] = &[&[b"vault_asset", user_key.as_ref(), &[bump]]];

            let accounts = anchor_lang::system_program::Transfer {
                from: self.vault_asset.to_account_info(),
                to: self.user.to_account_info(),
            };

            anchor_lang::system_program::transfer(
                CpiContext::new_with_signer(
                    self.system_program.to_account_info(),
                    accounts,
                    signer_seeds,
                ),
                amount,
            )?;
        }

        Ok(())
    }
}
