use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;

use instructions::*;
use state::*;


declare_id!("3NRNFiWAT7rroze7b78sP9yQEdx1S34Q1tZqzewTfHja");

#[program]
pub mod vault {
  

use super::*;

    pub fn withdraw(ctx: Context<Withdraw>,
    amount: u64,
    ) -> Result<()> {
        Ok(())
       
    }
}

#[derive(Accounts)]
pub struct Initialize {}
