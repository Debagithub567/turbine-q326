use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

pub use constants::*;
pub use error::*;
pub use instructions::*;
pub use state::*;

declare_id!("qWtAtEL4Xop24c1pqddXNNPwe1Q64vfTTHdexg37LZM");

#[program]
pub mod escrow {
    use super::*;

    pub fn make(
        ctx: Context<Make>,
        seed: u64,
        deposit: u64,
        receive: u64,
        expiration: i64,
    ) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp;
        let bump = ctx.bumps.escrow;

        ctx.accounts
            .make(seed, deposit, receive, expiration, current_time, bump)
    }

    pub fn take(ctx: Context<Take>) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp;

        ctx.accounts.take(current_time)
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp;

        ctx.accounts.refund(current_time)
    }

    pub fn update(ctx: Context<Update>, new_receive: u64, new_expiration: i64) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp;

        ctx.accounts
            .update(new_receive, new_expiration, current_time)
    }
}
