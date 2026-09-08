use anchor_lang::prelude::*;
use crate::VaultState;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub user: Signer<'info>,
    pub vault_state: Account<'info, VaultState>,

    #[account(
        seeds = [
            b"vault_asset",
            vault_state.owner.as_ref()
        ],
        bump
    )]
    pub vault_asset: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}