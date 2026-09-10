use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;

pub use error::*;
pub use instructions::*;
pub use state::*;

declare_id!("C7FsYTTXgD9GEDVK4GMw6v9TqSgw5AJGWSdiydzwxXDR");

#[program]
pub mod non_custodial_vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let bump = ctx.bumps.vault_state;

        ctx.accounts.initialize(bump)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        ctx.accounts.deposit(amount)
    }

    pub fn redeem(ctx: Context<Redeem>, shares: u64) -> Result<()> {
        ctx.accounts.redeem(shares)
    }
}
