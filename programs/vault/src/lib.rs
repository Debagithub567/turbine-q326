use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;

use error::*;
use instructions::*;
use state::*;

declare_id!("3NRNFiWAT7rroze7b78sP9yQEdx1S34Q1tZqzewTfHja");

#[program]
pub mod vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.initialize()
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        ctx.accounts.deposit(amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let bump = ctx.bumps.vault_asset;

        ctx.accounts.withdraw(amount, bump)
    }

    pub fn close(ctx: Context<Close>) -> Result<()> {
        let bump = ctx.bumps.vault_asset;

        ctx.accounts.close(bump)
    }
}
