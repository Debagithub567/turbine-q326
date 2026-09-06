use anchor_lang::prelude::*;
use crate::VaultState;


#[derive(Accounts)]
pub struct Withdraw<'info>{
    pub user: Signer<'info>,
    pub vautl_state: Account<'info, VaultState>,
    pub vault_asset: SystemAccount<'info>,
    pub system_program: Program<'info , System>,
}