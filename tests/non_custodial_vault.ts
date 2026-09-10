import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";

import { NonCustodialVault } from "../target/types/non_custodial_vault";

import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  getAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

describe("non_custodial_vault", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider =
    anchor.getProvider() as anchor.AnchorProvider;

  const program =
    anchor.workspace.nonCustodialVault as Program<NonCustodialVault>;

  const authority = provider.wallet;
  const payer = provider.wallet.payer!;

  let positionMint: anchor.web3.PublicKey;
  let shareMint: anchor.web3.PublicKey;

  let authorityPositionAta: anchor.web3.PublicKey;
  let authorityShareAta: anchor.web3.PublicKey;

  let vaultState: anchor.web3.PublicKey;
  let vaultPositionAta: anchor.web3.PublicKey;

 
  // PDA DERIVATION
  

  
  const [vaultStatePda] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        authority.publicKey.toBuffer(),
      ],
      program.programId,
    );

  vaultState = vaultStatePda;


  // 1. SETUP


  it("sets up the vault assets", async () => {
    
    positionMint = await createMint(
      provider.connection,
      payer,
      authority.publicKey,
      null,
      6,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID,
    );

    
    shareMint = await createMint(
      provider.connection,
      payer,
      authority.publicKey,
      null,
      6,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID,
    );

   
    // Authority's position-token ATA
    

    const authorityPositionAccount =
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        positionMint,
        authority.publicKey,
        false,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

    authorityPositionAta =
      authorityPositionAccount.address;

    
    // Authority's share-token ATA
    

    const authorityShareAccount =
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        shareMint,
        authority.publicKey,
        false,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

    authorityShareAta =
      authorityShareAccount.address;

    
    // Vault position ATA
    

    const vaultPositionAccount =
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        positionMint,
        vaultState,
        true,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

    vaultPositionAta =
      vaultPositionAccount.address;

    // Give the authority 1,000 underlying tokens.
    await mintTo(
      provider.connection,
      payer,
      positionMint,
      authorityPositionAta,
      authority.publicKey,
      1_000,
      [],
      undefined,
      TOKEN_PROGRAM_ID,
    );

    console.log(
      "Position mint:",
      positionMint.toBase58(),
    );

    console.log(
      "Share mint:",
      shareMint.toBase58(),
    );

    console.log(
      "Vault state:",
      vaultState.toBase58(),
    );

    console.log(
      "Vault position:",
      vaultPositionAta.toBase58(),
    );

    const authorityBalance =
      await getAccount(
        provider.connection,
        authorityPositionAta,
      );

    expect(
      Number(authorityBalance.amount),
    ).to.equal(1_000);

    
    const vaultPositionAccountInfo =
      await getAccount(
        provider.connection,
        vaultPositionAta,
      );

    expect(
      vaultPositionAccountInfo.owner.toBase58(),
    ).to.equal(
      vaultState.toBase58(),
    );

    expect(
      Number(vaultPositionAccountInfo.amount),
    ).to.equal(0);
  });


  // 2. INITIALIZE


  it("initializes the vault", async () => {
    await program.methods
      .initialize()
      .accountsPartial({
        authority: authority.publicKey,
        positionMint,
        shareMint,
        vaultState,
        systemProgram:
          anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const state =
      await program.account.vaultState.fetch(
        vaultState,
      );

    expect(
      state.authority.toBase58(),
    ).to.equal(
      authority.publicKey.toBase58(),
    );

    expect(
      state.positionMint.toBase58(),
    ).to.equal(
      positionMint.toBase58(),
    );

    expect(
      state.shareMint.toBase58(),
    ).to.equal(
      shareMint.toBase58(),
    );

    expect(
      state.totalAssets.toNumber(),
    ).to.equal(0);

    expect(
      state.totalShares.toNumber(),
    ).to.equal(0);

    console.log(
      "Vault initialized successfully",
    );
  });

 
  // 3. DEPOSIT


  it("deposits assets and receives proportional shares", async () => {
    const depositAmount =
      new anchor.BN(500);

    await program.methods
      .deposit(depositAmount)
      .accountsPartial({
        vaultState,
        positionMint,
        user: authority.publicKey,
        userPosition: authorityPositionAta,
        vaultPosition: vaultPositionAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const state =
      await program.account.vaultState.fetch(
        vaultState,
      );

    
    expect(
      state.totalAssets.toNumber(),
    ).to.equal(500);

    expect(
      state.totalShares.toNumber(),
    ).to.equal(500);

    // Vault should contain 500 tokens.
    const vaultBalance =
      await getAccount(
        provider.connection,
        vaultPositionAta,
      );

    expect(
      Number(vaultBalance.amount),
    ).to.equal(500);

    // Authority should have 500 remaining.
    const authorityBalance =
      await getAccount(
        provider.connection,
        authorityPositionAta,
      );

    expect(
      Number(authorityBalance.amount),
    ).to.equal(500);

    console.log(
      "Vault assets after deposit:",
      Number(vaultBalance.amount),
    );

    console.log(
      "Total shares:",
      state.totalShares.toNumber(),
    );
  });

  
  // 4. REDEEM
  

  it("redeems shares for underlying assets", async () => {
    const redeemShares =
      new anchor.BN(200);

    const authorityBefore =
      await getAccount(
        provider.connection,
        authorityPositionAta,
      );

    await program.methods
      .redeem(redeemShares)
      .accountsPartial({
        vaultState,
        positionMint,
        user: authority.publicKey,
        userPosition: authorityPositionAta,
        vaultPosition: vaultPositionAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const authorityAfter =
      await getAccount(
        provider.connection,
        authorityPositionAta,
      );

    /*
     * Before redeem:
     *
     * 500 assets
     * 500 shares
     *
     * Redeem 200 shares.
     *
     * assets =
     * 200 * 500 / 500
     * = 200
     *
     * Therefore:
     *
     * User receives 200 assets.
     *
     * Vault becomes:
     * 300 assets
     * 300 shares
     */

    expect(
      Number(authorityAfter.amount),
    ).to.equal(
      Number(authorityBefore.amount) + 200,
    );

    const state =
      await program.account.vaultState.fetch(
        vaultState,
      );

    expect(
      state.totalShares.toNumber(),
    ).to.equal(300);

    expect(
      state.totalAssets.toNumber(),
    ).to.equal(300);

    const vaultBalance =
      await getAccount(
        provider.connection,
        vaultPositionAta,
      );

    expect(
      Number(vaultBalance.amount),
    ).to.equal(300);

    console.log(
      "Vault assets after redeem:",
      Number(vaultBalance.amount),
    );

    console.log(
      "Total shares after redeem:",
      state.totalShares.toNumber(),
    );
  });

  
  // 5. INVALID REDEEM
  

  it("rejects redeeming more shares than owned", async () => {
    const excessiveShares =
      new anchor.BN(301);

    try {
      await program.methods
        .redeem(excessiveShares)
        .accountsPartial({
          vaultState,
          positionMint,
          user: authority.publicKey,
          userPosition: authorityPositionAta,
          vaultPosition: vaultPositionAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      expect.fail(
        "Redeem should have failed",
      );
    } catch (error) {
      expect(error).to.not.equal(null);

      console.log(
        "Correctly rejected excessive redemption",
      );
    }
  });
});