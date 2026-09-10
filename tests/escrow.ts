import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Escrow } from "../target/types/escrow";

import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
  getAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

describe("escrow", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = anchor.workspace.escrow as Program<Escrow>;

  const maker = provider.wallet;
  const taker = anchor.web3.Keypair.generate();
  const payer = provider.wallet.payer!;

  let mintA: anchor.web3.PublicKey;
  let mintB: anchor.web3.PublicKey;

  let makerAtaA: anchor.web3.PublicKey;
  let makerAtaB: anchor.web3.PublicKey;

  let takerAtaA: anchor.web3.PublicKey;
  let takerAtaB: anchor.web3.PublicKey;

  let escrow: anchor.web3.PublicKey;
  let vault: anchor.web3.PublicKey;

  const seed = new anchor.BN(1);

  function getEscrowPda(
    makerKey: anchor.web3.PublicKey,
    seed: anchor.BN,
  ): anchor.web3.PublicKey {
    const seedBuffer = seed.toArrayLike(Buffer, "le", 8);

    return anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        makerKey.toBuffer(),
        seedBuffer,
      ],
      program.programId,
    )[0];
  }

  it("sets up token accounts", async () => {
    // Create Token A
    mintA = await createMint(
      provider.connection,
      payer,
      maker.publicKey,
      null,
      6,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID,
    );

    // Create Token B
    mintB = await createMint(
      provider.connection,
      payer,
      maker.publicKey,
      null,
      6,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID,
    );

    // Maker Token A ATA
    const makerAccountA =
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        mintA,
        maker.publicKey,
        false,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

    makerAtaA = makerAccountA.address;

    // Maker Token B ATA
    const makerAccountB =
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        mintB,
        maker.publicKey,
        false,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

    makerAtaB = makerAccountB.address;

    // Fund taker with SOL for transaction fees
    const signature =
      await provider.connection.requestAirdrop(
        taker.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL,
      );

    await provider.connection.confirmTransaction(
      signature,
      "confirmed",
    );

    // Taker Token A ATA
    const takerAccountA =
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        mintA,
        taker.publicKey,
        false,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

    takerAtaA = takerAccountA.address;

    // Taker Token B ATA
    const takerAccountB =
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        mintB,
        taker.publicKey,
        false,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

    takerAtaB = takerAccountB.address;

    // Mint Token A to maker
    await mintTo(
      provider.connection,
      payer,
      mintA,
      makerAtaA,
      maker.publicKey,
      10_000_000,
      [],
      undefined,
      TOKEN_PROGRAM_ID,
    );

    // Mint Token B to taker
    await mintTo(
      provider.connection,
      payer,
      mintB,
      takerAtaB,
      maker.publicKey,
      10_000_000,
      [],
      undefined,
      TOKEN_PROGRAM_ID,
    );

    escrow = getEscrowPda(maker.publicKey, seed);

    vault = getAssociatedTokenAddressSync(
      mintA,
      escrow,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    console.log("Mint A:", mintA.toBase58());
    console.log("Mint B:", mintB.toBase58());
    console.log("Escrow:", escrow.toBase58());
    console.log("Vault:", vault.toBase58());

    expect(mintA).to.not.equal(undefined);
    expect(mintB).to.not.equal(undefined);
  });

  it("makes an escrow", async () => {
    const depositAmount = new anchor.BN(1_000_000);
    const receiveAmount = new anchor.BN(2_000_000);

    await program.methods
      .make(
        seed,
        depositAmount,
        receiveAmount,
        new anchor.BN(0),
      )
      .accountsPartial({
        maker: maker.publicKey,
        mintA,
        mintB,
        makerAtaA,
        escrow,
        associatedTokenProgram:
          ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram:
          anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const escrowAccount =
      await program.account.escrow.fetch(escrow);

    expect(escrowAccount.maker.toBase58()).to.equal(
      maker.publicKey.toBase58(),
    );

    expect(escrowAccount.mintA.toBase58()).to.equal(
      mintA.toBase58(),
    );

    expect(escrowAccount.mintB.toBase58()).to.equal(
      mintB.toBase58(),
    );

    expect(
      escrowAccount.receive.toNumber(),
    ).to.equal(2_000_000);

    const vaultAccount =
      await getAccount(
        provider.connection,
        vault,
      );

    expect(
      Number(vaultAccount.amount),
    ).to.equal(1_000_000);

    console.log("Escrow created successfully");
  });

  it("updates the escrow", async () => {
    const newReceiveAmount =
      new anchor.BN(3_000_000);

    await program.methods
      .update(
        newReceiveAmount,
        new anchor.BN(0),
      )
      .accountsPartial({
        maker: maker.publicKey,
        escrow,
      })
      .rpc();

    const escrowAccount =
      await program.account.escrow.fetch(escrow);

    expect(
      escrowAccount.receive.toNumber(),
    ).to.equal(3_000_000);

    console.log("Escrow updated successfully");
  });

  it("takes the escrow", async () => {
    const takerTokenBBefore =
      await getAccount(
        provider.connection,
        takerAtaB,
      );

    const makerTokenBBefore =
      await getAccount(
        provider.connection,
        makerAtaB,
      );

    await program.methods
      .take()
      .accountsPartial({
        taker: taker.publicKey,
        maker: maker.publicKey,
        escrow,
        mintA,
        mintB,
        vault,
        takerAtaA,
        takerAtaB,
        makerAtaB,
        associatedTokenProgram:
          ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram:
          anchor.web3.SystemProgram.programId,
      })
      .signers([taker])
      .rpc();

    const takerTokenAAfter =
      await getAccount(
        provider.connection,
        takerAtaA,
      );

    const takerTokenBAfter =
      await getAccount(
        provider.connection,
        takerAtaB,
      );

    const makerTokenBAfter =
      await getAccount(
        provider.connection,
        makerAtaB,
      );

    expect(
      Number(takerTokenAAfter.amount),
    ).to.equal(1_000_000);

    expect(
      Number(takerTokenBAfter.amount),
    ).to.equal(
      Number(takerTokenBBefore.amount) -
        3_000_000,
    );

    expect(
      Number(makerTokenBAfter.amount),
    ).to.equal(
      Number(makerTokenBBefore.amount) +
        3_000_000,
    );

    const escrowAccountInfo =
      await provider.connection.getAccountInfo(
        escrow,
      );

    expect(escrowAccountInfo).to.equal(null);

    const vaultAccountInfo =
      await provider.connection.getAccountInfo(
        vault,
      );

    expect(vaultAccountInfo).to.equal(null);

    console.log("Escrow taken successfully");
  });

  it("creates and refunds an escrow", async () => {
    const refundSeed = new anchor.BN(2);

    const refundEscrow =
      getEscrowPda(
        maker.publicKey,
        refundSeed,
      );

    const refundVault =
      getAssociatedTokenAddressSync(
        mintA,
        refundEscrow,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

    const makerBefore =
      await getAccount(
        provider.connection,
        makerAtaA,
      );

    await program.methods
      .make(
        refundSeed,
        new anchor.BN(500_000),
        new anchor.BN(1_000_000),
        new anchor.BN(0),
      )
      .accountsPartial({
        maker: maker.publicKey,
        mintA,
        mintB,
        makerAtaA,
        escrow: refundEscrow,
        associatedTokenProgram:
          ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram:
          anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .refund()
      .accountsPartial({
        maker: maker.publicKey,
        escrow: refundEscrow,
        mintA,
        makerAtaA,
        vault: refundVault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const makerAfter =
      await getAccount(
        provider.connection,
        makerAtaA,
      );

    expect(
      Number(makerAfter.amount),
    ).to.equal(
      Number(makerBefore.amount),
    );

    const escrowAccountInfo =
      await provider.connection.getAccountInfo(
        refundEscrow,
      );

    expect(escrowAccountInfo).to.equal(null);

    const vaultAccountInfo =
      await provider.connection.getAccountInfo(
        refundVault,
      );

    expect(vaultAccountInfo).to.equal(null);

    console.log("Escrow refunded successfully");
  });
});