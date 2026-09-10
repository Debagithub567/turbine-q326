use anchor_lang::prelude::*;

use crate::VaultState;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        seeds = [b"vault_state", user.key().as_ref()],
        bump,
        space = VaultState::DISCRIMINATOR.len() + VaultState::INIT_SPACE
    )]
    pub vault_state: Account<'info, VaultState>,

    /// CHECK:
    /// This account is a zero-data system-owned PDA.
    #[account(
        init,
        payer = user,
        seeds = [b"vault_asset", user.key().as_ref()],
        bump,
        space = 0,
        owner = system_program.key()
    )]
    pub vault_asset: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> Initialize<'info> {
    pub fn initialize(&mut self) -> Result<()> {
        self.vault_state.owner = self.user.key();
        self.vault_state.vault_asset = self.vault_asset.key();

        Ok(())
    }
}
