import { Account, AleoNetworkClient, ExecutionResponse, FunctionKeyProvider, FunctionKeyPair, OfflineQuery, KeySearchParams, RecordPlaintext, RecordProvider, RecordSearchParams, PrivateKey, Program, ProgramImports, ProvingKey, VerifyingKey, Transaction } from "./index";
/**
 * Represents the options for executing a transaction in the Aleo network.
 * This interface is used to specify the parameters required for building and submitting an execution transaction.
 *
 * @property {string} programName - The name of the program containing the function to be executed.
 * @property {string} functionName - The name of the function to execute within the program.
 * @property {number} fee - The fee to be paid for the transaction.
 * @property {boolean} privateFee - If true, uses a private record to pay the fee; otherwise, uses the account's public credit balance.
 * @property {string[]} inputs - The inputs to the function being executed.
 * @property {RecordSearchParams} [recordSearchParams] - Optional parameters for searching for a record to pay the execution transaction fee.
 * @property {KeySearchParams} [keySearchParams] - Optional parameters for finding the matching proving & verifying keys for the function.
 * @property {string | RecordPlaintext} [feeRecord] - Optional fee record to use for the transaction.
 * @property {ProvingKey} [provingKey] - Optional proving key to use for the transaction.
 * @property {VerifyingKey} [verifyingKey] - Optional verifying key to use for the transaction.
 * @property {PrivateKey} [privateKey] - Optional private key to use for the transaction.
 * @property {OfflineQuery} [offlineQuery] - Optional offline query if creating transactions in an offline environment.
 * @property {string | Program} [program] - Optional program source code to use for the transaction.
 * @property {ProgramImports} [imports] - Optional programs that the program being executed imports.
 */
interface ExecuteOptions {
    programName: string;
    functionName: string;
    fee: number;
    privateFee: boolean;
    inputs: string[];
    recordSearchParams?: RecordSearchParams;
    keySearchParams?: KeySearchParams;
    feeRecord?: string | RecordPlaintext;
    provingKey?: ProvingKey;
    verifyingKey?: VerifyingKey;
    privateKey?: PrivateKey;
    offlineQuery?: OfflineQuery;
    program?: string | Program;
    imports?: ProgramImports;
}
/**
 * The ProgramManager class is used to execute and deploy programs on the Aleo network and create value transfers.
 */
declare class ProgramManager {
    account: Account | undefined;
    keyProvider: FunctionKeyProvider;
    host: string;
    networkClient: AleoNetworkClient;
    recordProvider: RecordProvider | undefined;
    /** Create a new instance of the ProgramManager
     *
     * @param { string | undefined } host A host uri running the official Aleo API
     * @param { FunctionKeyProvider | undefined } keyProvider A key provider that implements {@link FunctionKeyProvider} interface
     * @param { RecordProvider | undefined } recordProvider A record provider that implements {@link RecordProvider} interface
     */
    constructor(host?: string | undefined, keyProvider?: FunctionKeyProvider | undefined, recordProvider?: RecordProvider | undefined);
    /**
     * Set the account to use for transaction submission to the Aleo network
     *
     * @param {Account} account Account to use for transaction submission
     */
    setAccount(account: Account): void;
    /**
     * Set the key provider that provides the proving and verifying keys for programs
     *
     * @param {FunctionKeyProvider} keyProvider
     */
    setKeyProvider(keyProvider: FunctionKeyProvider): void;
    /**
     * Set the host peer to use for transaction submission to the Aleo network
     *
     * @param host {string} Peer url to use for transaction submission
     */
    setHost(host: string): void;
    /**
     * Set the record provider that provides records for transactions
     *
     * @param {RecordProvider} recordProvider
     */
    setRecordProvider(recordProvider: RecordProvider): void;
    /**
     * Deploy an Aleo program to the Aleo network
     *
     * @param {string} program Program source code
     * @param {number} fee Fee to pay for the transaction
     * @param {boolean} privateFee Use a private record to pay the fee. If false this will use the account's public credit balance
     * @param {RecordSearchParams | undefined} recordSearchParams Optional parameters for searching for a record to use
     * pay the deployment fee
     * @param {string | RecordPlaintext | undefined} feeRecord Optional Fee record to use for the transaction
     * @param {PrivateKey | undefined} privateKey Optional private key to use for the transaction
     * @returns {string | Error} The transaction id of the deployed program or a failure message from the network
     *
     * @example
     * // Create a new NetworkClient, KeyProvider, and RecordProvider
     * const networkClient = new AleoNetworkClient("https://api.explorer.aleo.org/v1");
     * const keyProvider = new AleoKeyProvider();
     * const recordProvider = new NetworkRecordProvider(account, networkClient);
     *
     * // Initialize a program manager with the key provider to automatically fetch keys for deployments
     * const program = "program hello_hello.aleo;\n\nfunction hello:\n    input r0 as u32.public;\n    input r1 as u32.private;\n    add r0 r1 into r2;\n    output r2 as u32.private;\n";
     * const programManager = new ProgramManager("https://api.explorer.aleo.org/v1", keyProvider, recordProvider);
     *
     * // Define a fee in credits
     * const fee = 1.2;
     *
     * // Deploy the program
     * const tx_id = await programManager.deploy(program, fee);
     *
     * // Verify the transaction was successful
     * const transaction = await programManager.networkClient.getTransaction(tx_id);
     */
    deploy(program: string, fee: number, privateFee: boolean, recordSearchParams?: RecordSearchParams, feeRecord?: string | RecordPlaintext, privateKey?: PrivateKey): Promise<string | Error>;
    /**
     * Builds an execution transaction for submission to the Aleo network.
     *
     * @param {ExecuteOptions} options - The options for the execution transaction.
     * @returns {Promise<Transaction | Error>} - A promise that resolves to the transaction or an error.
     *
     * @example
     * // Create a new NetworkClient, KeyProvider, and RecordProvider using official Aleo record, key, and network providers
     * const networkClient = new AleoNetworkClient("https://vm.aleo.org/api");
     * const keyProvider = new AleoKeyProvider();
     * keyProvider.useCache = true;
     * const recordProvider = new NetworkRecordProvider(account, networkClient);
     *
     * // Initialize a program manager with the key provider to automatically fetch keys for executions
     * const programManager = new ProgramManager("https://vm.aleo.org/api", keyProvider, recordProvider);
     *
     * // Build and execute the transaction
     * const transaction = await programManager.buildExecutionTransaction({
     *   programName: "hello_hello.aleo",
     *   functionName: "hello_hello",
     *   fee: 0.020,
     *   privateFee: false,
     *   inputs: ["5u32", "5u32"],
     *   keySearchParams: { "cacheKey": "hello_hello:hello" }
     * });
     * const result = await programManager.networkClient.submitTransaction(transaction);
     */
    buildExecutionTransaction(options: ExecuteOptions): Promise<Transaction | Error>;
    /**
     * Builds an execution transaction for submission to the Aleo network.
     *
     * @param {ExecuteOptions} options - The options for the execution transaction.
     * @returns {Promise<Transaction | Error>} - A promise that resolves to the transaction or an error.
     *
     * @example
     * // Create a new NetworkClient, KeyProvider, and RecordProvider using official Aleo record, key, and network providers
     * const networkClient = new AleoNetworkClient("https://vm.aleo.org/api");
     * const keyProvider = new AleoKeyProvider();
     * keyProvider.useCache = true;
     * const recordProvider = new NetworkRecordProvider(account, networkClient);
     *
     * // Initialize a program manager with the key provider to automatically fetch keys for executions
     * const programManager = new ProgramManager("https://vm.aleo.org/api", keyProvider, recordProvider);
     *
     * // Build and execute the transaction
     * const transaction = await programManager.execute({
     *   programName: "hello_hello.aleo",
     *   functionName: "hello_hello",
     *   fee: 0.020,
     *   privateFee: false,
     *   inputs: ["5u32", "5u32"],
     *   keySearchParams: { "cacheKey": "hello_hello:hello" }
     * });
     * const result = await programManager.networkClient.submitTransaction(transaction);
     */
    execute(options: ExecuteOptions): Promise<string | Error>;
    /**
     * Run an Aleo program in offline mode
     *
     * @param {string} program Program source code containing the function to be executed
     * @param {string} function_name Function name to execute
     * @param {string[]} inputs Inputs to the function
     * @param {number} proveExecution Whether to prove the execution of the function and return an execution transcript
     * that contains the proof.
     * @param {string[] | undefined} imports Optional imports to the program
     * @param {KeySearchParams | undefined} keySearchParams Optional parameters for finding the matching proving &
     * verifying keys for the function
     * @param {ProvingKey | undefined} provingKey Optional proving key to use for the transaction
     * @param {VerifyingKey | undefined} verifyingKey Optional verifying key to use for the transaction
     * @param {PrivateKey | undefined} privateKey Optional private key to use for the transaction
     * @param {OfflineQuery | undefined} offlineQuery Optional offline query if creating transactions in an offline environment
     * @returns {Promise<string | Error>}
     *
     * @example
     * import { Account, Program } from '@aleohq/sdk';
     *
     * /// Create the source for the "helloworld" program
     * const program = "program helloworld.aleo;\n\nfunction hello:\n    input r0 as u32.public;\n    input r1 as u32.private;\n    add r0 r1 into r2;\n    output r2 as u32.private;\n";
     * const programManager = new ProgramManager();
     *
     * /// Create a temporary account for the execution of the program
     * const account = new Account();
     * programManager.setAccount(account);
     *
     * /// Get the response and ensure that the program executed correctly
     * const executionResponse = await programManager.executeOffline(program, "hello", ["5u32", "5u32"]);
     * const result = executionResponse.getOutputs();
     * assert(result === ["10u32"]);
     */
    run(program: string, function_name: string, inputs: string[], proveExecution: boolean, imports?: ProgramImports, keySearchParams?: KeySearchParams, provingKey?: ProvingKey, verifyingKey?: VerifyingKey, privateKey?: PrivateKey, offlineQuery?: OfflineQuery): Promise<ExecutionResponse>;
    /**
     * Join two credits records into a single credits record
     *
     * @param {RecordPlaintext | string} recordOne First credits record to join
     * @param {RecordPlaintext | string} recordTwo Second credits record to join
     * @param {number} fee Fee in credits pay for the join transaction
     * @param {boolean} privateFee Use a private record to pay the fee. If false this will use the account's public credit balance
     * @param {RecordSearchParams | undefined} recordSearchParams Optional parameters for finding the fee record to use
     * to pay the fee for the join transaction
     * @param {RecordPlaintext | string | undefined} feeRecord Fee record to use for the join transaction
     * @param {PrivateKey | undefined} privateKey Private key to use for the join transaction
     * @param {OfflineQuery | undefined} offlineQuery Optional offline query if creating transactions in an offline environment
     * @returns {Promise<string | Error>}
     */
    join(recordOne: RecordPlaintext | string, recordTwo: RecordPlaintext | string, fee: number, privateFee: boolean, recordSearchParams?: RecordSearchParams | undefined, feeRecord?: RecordPlaintext | string | undefined, privateKey?: PrivateKey, offlineQuery?: OfflineQuery): Promise<string | Error>;
    /**
     * Split credits into two new credits records
     *
     * @param {number} splitAmount Amount in microcredits to split from the original credits record
     * @param {RecordPlaintext | string} amountRecord Amount record to use for the split transaction
     * @param {PrivateKey | undefined} privateKey Optional private key to use for the split transaction
     * @param {OfflineQuery | undefined} offlineQuery Optional offline query if creating transactions in an offline environment
     * @returns {Promise<string | Error>}
     *
     * @example
     * // Create a new NetworkClient, KeyProvider, and RecordProvider
     * const networkClient = new AleoNetworkClient("https://vm.aleo.org/api");
     * const keyProvider = new AleoKeyProvider();
     * const recordProvider = new NetworkRecordProvider(account, networkClient);
     *
     * // Initialize a program manager with the key provider to automatically fetch keys for executions
     * const programName = "hello_hello.aleo";
     * const programManager = new ProgramManager("https://vm.aleo.org/api", keyProvider, recordProvider);
     * const record = "{  owner: aleo184vuwr5u7u0ha5f5k44067dd2uaqewxx6pe5ltha5pv99wvhfqxqv339h4.private,  microcredits: 45000000u64.private,  _nonce: 4106205762862305308495708971985748592380064201230396559307556388725936304984group.public}"
     * const tx_id = await programManager.split(25000000, record);
     * const transaction = await programManager.networkClient.getTransaction(tx_id);
     */
    split(splitAmount: number, amountRecord: RecordPlaintext | string, privateKey?: PrivateKey, offlineQuery?: OfflineQuery): Promise<string | Error>;
    /**
     * Pre-synthesize proving and verifying keys for a program
     *
     * @param program {string} The program source code to synthesize keys for
     * @param function_id {string} The function id to synthesize keys for
     * @param inputs {Array<string>}  Sample inputs to the function
     * @param privateKey {PrivateKey | undefined} Optional private key to use for the key synthesis
     *
     * @returns {Promise<FunctionKeyPair | Error>}
     */
    synthesizeKeys(program: string, function_id: string, inputs: Array<string>, privateKey?: PrivateKey): Promise<FunctionKeyPair | Error>;
    /**
     * Build a transaction to transfer credits to another account for later submission to the Aleo network
     *
     * @param {number} amount The amount of credits to transfer
     * @param {string} recipient The recipient of the transfer
     * @param {string} transferType The type of transfer to perform - options: 'private', 'privateToPublic', 'public', 'publicToPrivate'
     * @param {number} fee The fee to pay for the transfer
     * @param {boolean} privateFee Use a private record to pay the fee. If false this will use the account's public credit balance
     * @param {RecordSearchParams | undefined} recordSearchParams Optional parameters for finding the amount and fee
     * records for the transfer transaction
     * @param {RecordPlaintext | string} amountRecord Optional amount record to use for the transfer
     * @param {RecordPlaintext | string} feeRecord Optional fee record to use for the transfer
     * @param {PrivateKey | undefined} privateKey Optional private key to use for the transfer transaction
     * @param {OfflineQuery | undefined} offlineQuery Optional offline query if creating transactions in an offline environment
     * @returns {Promise<string | Error>} The transaction id of the transfer transaction
     *
     * @example
     * // Create a new NetworkClient, KeyProvider, and RecordProvider
     * const networkClient = new AleoNetworkClient("https://vm.aleo.org/api");
     * const keyProvider = new AleoKeyProvider();
     * const recordProvider = new NetworkRecordProvider(account, networkClient);
     *
     * // Initialize a program manager with the key provider to automatically fetch keys for executions
     * const programName = "hello_hello.aleo";
     * const programManager = new ProgramManager("https://vm.aleo.org/api", keyProvider, recordProvider);
     * await programManager.initialize();
     * const tx_id = await programManager.transfer(1, "aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px", "private", 0.2)
     * const transaction = await programManager.networkClient.getTransaction(tx_id);
     */
    buildTransferTransaction(amount: number, recipient: string, transferType: string, fee: number, privateFee: boolean, recordSearchParams?: RecordSearchParams, amountRecord?: RecordPlaintext | string, feeRecord?: RecordPlaintext | string, privateKey?: PrivateKey, offlineQuery?: OfflineQuery): Promise<Transaction | Error>;
    /**
     * Build a transfer_public transaction to transfer credits to another account for later submission to the Aleo network
     *
     * @param {number} amount The amount of credits to transfer
     * @param {string} recipient The recipient of the transfer
     * @param {string} transferType The type of transfer to perform - options: 'private', 'privateToPublic', 'public', 'publicToPrivate'
     * @param {number} fee The fee to pay for the transfer
     * @param {boolean} privateFee Use a private record to pay the fee. If false this will use the account's public credit balance
     * @param {RecordSearchParams | undefined} recordSearchParams Optional parameters for finding the amount and fee
     * records for the transfer transaction
     * @param {RecordPlaintext | string} amountRecord Optional amount record to use for the transfer
     * @param {RecordPlaintext | string} feeRecord Optional fee record to use for the transfer
     * @param {PrivateKey | undefined} privateKey Optional private key to use for the transfer transaction
     * @param {OfflineQuery | undefined} offlineQuery Optional offline query if creating transactions in an offline environment
     * @returns {Promise<string | Error>} The transaction id of the transfer transaction
     *
     * @example
     * // Create a new NetworkClient, KeyProvider, and RecordProvider
     * const networkClient = new AleoNetworkClient("https://vm.aleo.org/api");
     * const keyProvider = new AleoKeyProvider();
     * const recordProvider = new NetworkRecordProvider(account, networkClient);
     *
     * // Initialize a program manager with the key provider to automatically fetch keys for executions
     * const programName = "hello_hello.aleo";
     * const programManager = new ProgramManager("https://vm.aleo.org/api", keyProvider, recordProvider);
     * await programManager.initialize();
     * const tx_id = await programManager.transfer(1, "aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px", "private", 0.2)
     * const transaction = await programManager.networkClient.getTransaction(tx_id);
     */
    buildTransferPublicTransaction(amount: number, recipient: string, fee: number, privateKey?: PrivateKey, offlineQuery?: OfflineQuery): Promise<Transaction | Error>;
    /**
     * Transfer credits to another account
     *
     * @param {number} amount The amount of credits to transfer
     * @param {string} recipient The recipient of the transfer
     * @param {string} transferType The type of transfer to perform - options: 'private', 'privateToPublic', 'public', 'publicToPrivate'
     * @param {number} fee The fee to pay for the transfer
     * @param {boolean} privateFee Use a private record to pay the fee. If false this will use the account's public credit balance
     * @param {RecordSearchParams | undefined} recordSearchParams Optional parameters for finding the amount and fee
     * records for the transfer transaction
     * @param {RecordPlaintext | string} amountRecord Optional amount record to use for the transfer
     * @param {RecordPlaintext | string} feeRecord Optional fee record to use for the transfer
     * @param {PrivateKey | undefined} privateKey Optional private key to use for the transfer transaction
     * @param {OfflineQuery | undefined} offlineQuery Optional offline query if creating transactions in an offline environment
     * @returns {Promise<string | Error>} The transaction id of the transfer transaction
     *
     * @example
     * // Create a new NetworkClient, KeyProvider, and RecordProvider
     * const networkClient = new AleoNetworkClient("https://vm.aleo.org/api");
     * const keyProvider = new AleoKeyProvider();
     * const recordProvider = new NetworkRecordProvider(account, networkClient);
     *
     * // Initialize a program manager with the key provider to automatically fetch keys for executions
     * const programName = "hello_hello.aleo";
     * const programManager = new ProgramManager("https://vm.aleo.org/api", keyProvider, recordProvider);
     * await programManager.initialize();
     * const tx_id = await programManager.transfer(1, "aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px", "private", 0.2)
     * const transaction = await programManager.networkClient.getTransaction(tx_id);
     */
    transfer(amount: number, recipient: string, transferType: string, fee: number, privateFee: boolean, recordSearchParams?: RecordSearchParams, amountRecord?: RecordPlaintext | string, feeRecord?: RecordPlaintext | string, privateKey?: PrivateKey, offlineQuery?: OfflineQuery): Promise<string | Error>;
    /**
     * Build transaction to bond credits to a staking committee for later submission to the Aleo Network
     *
     * @example
     * // Create a keyProvider to handle key management
     * const keyProvider = new AleoKeyProvider();
     * keyProvider.useCache = true;
     *
     * // Create a new ProgramManager with the key that will be used to bond credits
     * const programManager = new ProgramManager("https://api.explorer.aleo.org/v1", keyProvider, undefined);
     * programManager.setAccount(new Account("YourPrivateKey"));
     *
     * // Create the bonding transaction
     * const tx_id = await programManager.bondPublic("aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px", 2000000);
     *
     * @returns string
     * @param {string} address Address of the validator to bond to, if this address is the same as the signer (i.e. the
     * executor of this function), it will attempt to bond the credits as a validator. Bonding as a validator currently
     * requires a minimum of 1,000,000 credits to bond (subject to change). If the address is specified is an existing
     * validator and is different from the address of the executor of this function, it will bond the credits to that
     * validator's staking committee as a delegator. A minimum of 10 credits is required to bond as a delegator.
     * @param {number} amount The amount of credits to bond
     * @param {Partial<ExecuteOptions>} options - Override default execution options.
     */
    buildBondPublicTransaction(address: string, amount: number, options?: Partial<ExecuteOptions>): Promise<Error | Transaction>;
    /**
     * Bond credits to a staking committee
     *
     * @example
     * // Create a keyProvider to handle key management
     * const keyProvider = new AleoKeyProvider();
     * keyProvider.useCache = true;
     *
     * // Create a new ProgramManager with the key that will be used to bond credits
     * const programManager = new ProgramManager("https://api.explorer.aleo.org/v1", keyProvider, undefined);
     * programManager.setAccount(new Account("YourPrivateKey"));
     *
     * // Create the bonding transaction
     * const tx_id = await programManager.bondPublic("aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px", 2000000);
     *
     * @returns string
     * @param {string} address Address of the validator to bond to, if this address is the same as the signer (i.e. the
     * executor of this function), it will attempt to bond the credits as a validator. Bonding as a validator currently
     * requires a minimum of 1,000,000 credits to bond (subject to change). If the address is specified is an existing
     * validator and is different from the address of the executor of this function, it will bond the credits to that
     * validator's staking committee as a delegator. A minimum of 10 credits is required to bond as a delegator.
     * @param {number} amount The amount of credits to bond
     * @param {Options} options Options for the execution
     */
    bondPublic(address: string, amount: number, options?: Partial<ExecuteOptions>): Promise<string | Error>;
    /**
     * Build a transaction to unbond public credits in the Aleo network.
     *
     * @param {number} amount - The amount of credits to unbond (scaled by 1,000,000).
     * @param {Partial<ExecuteOptions>} options - Override default execution options.
     * @returns {Promise<Transaction | Error>} - A promise that resolves to the transaction or an error message.
     *
     * @example
     * const programManager = new ProgramManager("https://api.explorer.aleo.org/v1", keyProvider, undefined);
     * const transaction = await programManager.buildUnbondPublicTransaction(2000000);
     * console.log(transaction);
     */
    buildUnbondPublicTransaction(amount: number, options?: Partial<ExecuteOptions>): Promise<Transaction | Error>;
    /**
     * Unbond a specified amount of staked credits to be used later
     *
     * @example
     * // Create a keyProvider to handle key management
     * const keyProvider = new AleoKeyProvider();
     * keyProvider.useCache = true;
     *
     * // Create a new ProgramManager with the key that will be used to bond credits
     * const programManager = new ProgramManager("https://api.explorer.aleo.org/v1", keyProvider, undefined);
     * programManager.setAccount(new Account("YourPrivateKey"));
     *
     * // Create the bonding transaction
     * const tx_id = await programManager.unbondPublic(10);
     *
     * @returns string
     * @param {number} amount Amount of credits to unbond. If the address of the executor of this function is an
     * existing validator, it will subtract this amount of credits from the validator's staked credits. If there are
     * less than 1,000,000 credits staked pool after the unbond, the validator will be removed from the validator set.
     * If the address of the executor of this function is not a validator and has credits bonded as a delegator, it will
     * subtract this amount of credits from the delegator's staked credits. If there are less than 10 credits bonded
     * after the unbond operation, the delegator will be removed from the validator's staking pool.
     * @param {Options} options Options for the execution
     */
    unbondPublic(amount: number, options?: Partial<ExecuteOptions>): Promise<string | Error>;
    /**
     * Build a transaction to claim unbonded public credits in the Aleo network.
     *
     * @param {Partial<ExecuteOptions>} options - Override default execution options.
     * @returns {Promise<Transaction | Error>} - A promise that resolves to the transaction or an error message.
     *
     * @example
     * const programManager = new ProgramManager("https://api.explorer.aleo.org/v1", keyProvider, undefined);
     * const transaction = await programManager.buildClaimUnbondPublicTransaction();
     * console.log(transaction);
     */
    buildClaimUnbondPublicTransaction(options?: Partial<ExecuteOptions>): Promise<Transaction | Error>;
    /**
     * Claim unbonded credits. If credits have been unbonded by the account executing this function, this method will
     * claim them and add them to the public balance of the account.
     *
     * @example
     * // Create a keyProvider to handle key management
     * const keyProvider = new AleoKeyProvider();
     * keyProvider.useCache = true;
     *
     * // Create a new ProgramManager with the key that will be used to bond credits
     * const programManager = new ProgramManager("https://api.explorer.aleo.org/v1", keyProvider, undefined);
     * programManager.setAccount(new Account("YourPrivateKey"));
     *
     * // Create the bonding transaction
     * const tx_id = await programManager.claimUnbondPublic();
     *
     * @returns string
     * @param {Options} options
     */
    claimUnbondPublic(options?: Partial<ExecuteOptions>): Promise<string | Error>;
    /**
     * Set Validator State
     * @returns string
     * @param {boolean} validator_state
     * @param {Partial<ExecuteOptions>} options - Override default execution options
     */
    setValidatorState(validator_state: boolean, options?: Partial<ExecuteOptions>): Promise<string | Error>;
    /**
     * Unbond Delegator As Validator
     * @returns {Promise<string | Error>} A promise that resolves to the transaction ID or an error message.
     * @param {string} address - The address of the delegator.
     * @param {Partial<ExecuteOptions>} options - Override default execution options.
     */
    unbondDelegatorAsValidator(address: string, options?: Partial<ExecuteOptions>): Promise<string | Error>;
    /**
     * Verify a proof of execution from an offline execution
     *
     * @param {executionResponse} executionResponse
     * @returns {boolean} True if the proof is valid, false otherwise
     */
    verifyExecution(executionResponse: ExecutionResponse): boolean;
    /**
     * Create a program object from a program's source code
     *
     * @param {string} program Program source code
     * @returns {Program | Error} The program object
     */
    createProgramFromSource(program: string): Program | Error;
    /**
     * Get the credits program object
     *
     * @returns {Program} The credits program object
     */
    creditsProgram(): Program;
    /**
     * Verify a program is valid
     *
     * @param {string} program The program source code
     */
    verifyProgram(program: string): boolean;
    getCreditsRecord(amount: number, nonces: string[], record?: RecordPlaintext | string, params?: RecordSearchParams): Promise<RecordPlaintext | Error>;
}
export { ProgramManager };
