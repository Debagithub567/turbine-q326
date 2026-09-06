use anchor_lang::prelude::*;

use anchor_lang::system_program::{transfer, Transfer};

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
    let from_pubkey = ctx.accounts.vault_asset.to_account_info();
    let to_pubkey = ctx.accounts.user.to_account_info();
    let program_id = ctx.accounts.system_program.to_account_info();
 
    let cpi_context = CpiContext::new(
        program_id,
        Transfer {
            from: from_pubkey,
            to: to_pubkey,
        },
    );
 
    transfer(cpi_context, amount)?;
    Ok(())
       
    }
}



