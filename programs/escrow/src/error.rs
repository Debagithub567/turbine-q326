use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowError {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,

    #[msg("Expiration must be in the future")]
    InvalidExpiration,

    #[msg("Escrow has expired")]
    EscrowExpired,

    #[msg("Escrow has not expired yet")]
    EscrowStillActive,

    #[msg("Invalid maker")]
    InvalidMaker,

    #[msg("Invalid mint A")]
    InvalidMintA,

    #[msg("Invalid mint B")]
    InvalidMintB,
}
