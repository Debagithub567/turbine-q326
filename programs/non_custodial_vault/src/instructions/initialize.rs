use anchor_lang::prelude::*;

use crate::VaultState;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    pub position_mint: Account<'info, anchor_spl::token::Mint>,

    pub share_mint: Account<'info, anchor_spl::token::Mint>,

    #[account(
        init,
        payer = authority,
        seeds = [b"vault", authority.key().as_ref()],
        bump,
        space = VaultState::DISCRIMINATOR.len() + VaultState::INIT_SPACE
    )]
    pub vault_state: Account<'info, VaultState>,

    pub system_program: Program<'info, System>,
}

impl<'info> Initialize<'info> {
    pub fn initialize(&mut self, bump: u8) -> Result<()> {
        self.vault_state.set_inner(VaultState {
            authority: self.authority.key(),
            position_mint: self.position_mint.key(),
            share_mint: self.share_mint.key(),
            total_assets: 0,
            total_shares: 0,
            bump,
        });

        Ok(())
    }
}
