import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Vault } from "../target/types/vault";

describe("vault", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = anchor.workspace.vault as Program<Vault>;

  const user = provider.wallet;

  
  // PDA derivation
 

  const [vaultState] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault_state"), user.publicKey.toBuffer()],
    program.programId,
  );

  const [vaultAsset] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault_asset"), user.publicKey.toBuffer()],
    program.programId,
  );


  // 1. Initialize
 

  it("initializes the vault", async () => {
    await program.methods
      .initialize()
      .accountsPartial({
        user: user.publicKey,
        vaultState,
        vaultAsset,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const state = await program.account.vaultState.fetch(vaultState);

    expect(state.owner.toBase58()).to.equal(
      user.publicKey.toBase58(),
    );

    expect(state.vaultAsset.toBase58()).to.equal(
      vaultAsset.toBase58(),
    );

    console.log("Vault state:", vaultState.toBase58());
    console.log("Vault asset:", vaultAsset.toBase58());
  });


  // 2. Deposit


  it("deposits SOL into the vault", async () => {
    const depositAmount = new anchor.BN(1_000_000_000); // 1 SOL

    await program.methods
      .deposit(depositAmount)
      .accountsPartial({
        user: user.publicKey,
        vaultState,
        vaultAsset,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const vaultAccount =
      await provider.connection.getAccountInfo(vaultAsset);

    expect(vaultAccount).to.not.equal(null);

    expect(vaultAccount!.lamports).to.be.at.least(
      depositAmount.toNumber(),
    );

    console.log(
      "Vault balance after deposit:",
      vaultAccount!.lamports,
      "lamports",
    );
  });


  // 3. Withdraw


  it("withdraws SOL from the vault", async () => {
    const withdrawAmount = new anchor.BN(400_000_000); 

    const before =
      await provider.connection.getAccountInfo(vaultAsset);

    expect(before).to.not.equal(null);

    const beforeBalance = before!.lamports;

    await program.methods
      .withdraw(withdrawAmount)
      .accountsPartial({
        user: user.publicKey,
        vaultState,
        vaultAsset,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const after =
      await provider.connection.getAccountInfo(vaultAsset);

    expect(after).to.not.equal(null);

    const afterBalance = after!.lamports;

    expect(afterBalance).to.equal(
      beforeBalance - withdrawAmount.toNumber(),
    );

    console.log(
      "Vault balance after withdrawal:",
      afterBalance,
      "lamports",
    );
  });


  // 4. Insufficient withdrawal


  it("rejects a withdrawal larger than the vault balance", async () => {
    const vaultAccount =
      await provider.connection.getAccountInfo(vaultAsset);

    expect(vaultAccount).to.not.equal(null);

    const excessiveAmount = new anchor.BN(
      vaultAccount!.lamports + 1,
    );

    try {
      await program.methods
        .withdraw(excessiveAmount)
        .accountsPartial({
          user: user.publicKey,
          vaultState,
          vaultAsset,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail(
        "Withdrawal should have failed",
      );
    } catch (error) {
      expect(error).to.not.equal(null);

      console.log(
        "Correctly rejected excessive withdrawal",
      );
    }
  });


  // 5. Close


  it("closes the vault", async () => {
    await program.methods
      .close()
      .accountsPartial({
        user: user.publicKey,
        vaultState,
        vaultAsset,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const state =
      await provider.connection.getAccountInfo(vaultState);

    expect(state).to.equal(null);

    console.log("Vault state successfully closed");
  });
});