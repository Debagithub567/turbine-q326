use anchor_lang::prelude::*;
use crate::VaultState;


#[derive(Accounts)]
pub struct Withdraw<'info>{
    user: Signer<'info>,
    vautl_state: Account<'info, VaultState>,
    vault_asset: SystemAccount<'info>,
    system_program: Program<'info , System>,
}