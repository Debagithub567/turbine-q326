use anchor_lang::prelude::*;

use crate::{constants::ESCROW_SEED, error::EscrowError, Escrow};

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(
        mut,
        seeds = [
            ESCROW_SEED,
            maker.key().as_ref(),
            escrow.seed.to_le_bytes().as_ref()
        ],
        bump = escrow.bump,
        has_one = maker @ EscrowError::InvalidMaker
    )]
    pub escrow: Account<'info, Escrow>,
}

impl<'info> Update<'info> {
    pub fn update(
        &mut self,
        new_receive: u64,
        new_expiration: i64,
        current_time: i64,
    ) -> Result<()> {
        require!(new_receive > 0, EscrowError::InvalidAmount);

        if new_expiration != 0 {
            require!(
                new_expiration > current_time,
                EscrowError::InvalidExpiration
            );
        }

        self.escrow.receive = new_receive;
        self.escrow.expiration = new_expiration;

        Ok(())
    }
}
