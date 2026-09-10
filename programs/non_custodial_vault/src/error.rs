use anchor_lang::prelude::*;

#[error_code]
pub enum NonCustodialVaultError {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,

    #[msg("Vault has insufficient shares")]
    InsufficientShares,

    #[msg("Vault has insufficient assets")]
    InsufficientAssets,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
