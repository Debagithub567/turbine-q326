use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{NonCustodialVaultError, VaultState};

#[derive(Accounts)]
pub struct Redeem<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", vault_state.authority.as_ref()],
        bump = vault_state.bump
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(
        mut,
        constraint = user_position.mint == vault_state.position_mint
    )]
    pub user_position: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = vault_position.mint == vault_state.position_mint
    )]
    pub vault_position: Account<'info, TokenAccount>,

    pub position_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

impl<'info> Redeem<'info> {
    pub fn redeem(&mut self, shares: u64) -> Result<()> {
        require!(shares > 0, NonCustodialVaultError::InvalidAmount);

        require!(
            shares <= self.vault_state.total_shares,
            NonCustodialVaultError::InsufficientShares
        );

        // Pro-rata against the vault's ACTUAL current balance, not the
        // total_assets ledger. Since shares <= total_shares is already
        // enforced above, this can never exceed vault_position.amount —
        // so redemption always succeeds and never blocks on liquidity.
        // Worst case (vault fully drained), you get 0 back but still
        // exit and burn your shares instead of being stuck forever.
        let assets = (shares as u128)
            .checked_mul(self.vault_position.amount as u128)
            .and_then(|v| v.checked_div(self.vault_state.total_shares as u128))
            .ok_or(NonCustodialVaultError::ArithmeticOverflow)?;

        let assets: u64 = assets
            .try_into()
            .map_err(|_| NonCustodialVaultError::ArithmeticOverflow)?;

        let authority_key = self.vault_state.authority;

        let signer_seeds: &[&[&[u8]]] =
            &[&[b"vault", authority_key.as_ref(), &[self.vault_state.bump]]];

        token::transfer(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                Transfer {
                    from: self.vault_position.to_account_info(),
                    to: self.user_position.to_account_info(),
                    authority: self.vault_state.to_account_info(),
                },
                signer_seeds,
            ),
            assets,
        )?;

        self.vault_state.total_assets = self.vault_state.total_assets.saturating_sub(assets);
        self.vault_state.total_shares -= shares;

        Ok(())
    }
}