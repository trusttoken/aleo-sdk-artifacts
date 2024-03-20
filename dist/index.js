import { ViewKey, Address, PrivateKeyCiphertext, PrivateKey, RecordCiphertext, Program, Transaction, ProvingKey, VerifyingKey, ProgramManager as ProgramManager$1, RecordPlaintext, verifyFunctionExecution } from '@aleohq/wasm';
export { Address, ExecutionResponse, Field, Execution as FunctionExecution, OfflineQuery, PrivateKey, PrivateKeyCiphertext, Program, ProgramManager as ProgramManagerBase, ProvingKey, RecordCiphertext, RecordPlaintext, Signature, Transaction, VerifyingKey, ViewKey, initThreadPool, verifyFunctionExecution } from '@aleohq/wasm';
import { wrap } from 'comlink';

/**
 * Key Management class. Enables the creation of a new Aleo Account, importation of an existing account from
 * an existing private key or seed, and message signing and verification functionality.
 *
 * An Aleo Account is generated from a randomly generated seed (number) from which an account private key, view key,
 * and a public account address are derived. The private key lies at the root of an Aleo account. It is a highly
 * sensitive secret and should be protected as it allows for creation of Aleo Program executions and arbitrary value
 * transfers. The View Key allows for decryption of a user's activity on the blockchain. The Address is the public
 * address to which other users of Aleo can send Aleo credits and other records to. This class should only be used
 * environments where the safety of the underlying key material can be assured.
 *
 * @example
 * // Create a new account
 * const myRandomAccount = new Account();
 *
 * // Create an account from a randomly generated seed
 * const seed = new Uint8Array([94, 91, 52, 251, 240, 230, 226, 35, 117, 253, 224, 210, 175, 13, 205, 120, 155, 214, 7, 169, 66, 62, 206, 50, 188, 40, 29, 122, 40, 250, 54, 18]);
 * const mySeededAccount = new Account({seed: seed});
 *
 * // Create an account from an existing private key
 * const myExistingAccount = new Account({privateKey: 'myExistingPrivateKey'})
 *
 * // Sign a message
 * const hello_world = Uint8Array.from([104, 101, 108, 108, 111 119, 111, 114, 108, 100])
 * const signature = myRandomAccount.sign(hello_world)
 *
 * // Verify a signature
 * myRandomAccount.verify(hello_world, signature)
 */
class Account {
    _privateKey;
    _viewKey;
    _address;
    constructor(params = {}) {
        try {
            this._privateKey = this.privateKeyFromParams(params);
        }
        catch (e) {
            console.error("Wrong parameter", e);
            throw new Error("Wrong Parameter");
        }
        this._viewKey = ViewKey.from_private_key(this._privateKey);
        this._address = Address.from_private_key(this._privateKey);
    }
    /**
     * Attempts to create an account from a private key ciphertext
     * @param {PrivateKeyCiphertext | string} ciphertext
     * @param {string} password
     * @returns {PrivateKey | Error}
     *
     * @example
     * const ciphertext = PrivateKey.newEncrypted("password");
     * const account = Account.fromCiphertext(ciphertext, "password");
     */
    static fromCiphertext(ciphertext, password) {
        try {
            ciphertext = (typeof ciphertext === "string") ? PrivateKeyCiphertext.fromString(ciphertext) : ciphertext;
            const _privateKey = PrivateKey.fromPrivateKeyCiphertext(ciphertext, password);
            return new Account({ privateKey: _privateKey.to_string() });
        }
        catch (e) {
            throw new Error("Wrong password or invalid ciphertext");
        }
    }
    privateKeyFromParams(params) {
        if (params.seed) {
            return PrivateKey.from_seed_unchecked(params.seed);
        }
        if (params.privateKey) {
            return PrivateKey.from_string(params.privateKey);
        }
        return new PrivateKey();
    }
    privateKey() {
        return this._privateKey;
    }
    viewKey() {
        return this._viewKey;
    }
    address() {
        return this._address;
    }
    toString() {
        return this.address().to_string();
    }
    /**
     * Encrypt the account's private key with a password
     * @param {string} ciphertext
     * @returns {PrivateKeyCiphertext}
     *
     * @example
     * const account = new Account();
     * const ciphertext = account.encryptAccount("password");
     */
    encryptAccount(password) {
        return this._privateKey.toCiphertext(password);
    }
    /**
     * Decrypts a Record in ciphertext form into plaintext
     * @param {string} ciphertext
     * @returns {Record}
     *
     * @example
     * const account = new Account();
     * const record = account.decryptRecord("record1ciphertext");
     */
    decryptRecord(ciphertext) {
        return this._viewKey.decrypt(ciphertext);
    }
    /**
     * Decrypts an array of Records in ciphertext form into plaintext
     * @param {string[]} ciphertexts
     * @returns {Record[]}
     *
     * @example
     * const account = new Account();
     * const record = account.decryptRecords(["record1ciphertext", "record2ciphertext"]);
     */
    decryptRecords(ciphertexts) {
        return ciphertexts.map((ciphertext) => this._viewKey.decrypt(ciphertext));
    }
    /**
     * Determines whether the account owns a ciphertext record
     * @param {RecordCipherText | string} ciphertext
     * @returns {boolean}
     *
     * @example
     * // Create a connection to the Aleo network and an account
     * const connection = new NodeConnection("vm.aleo.org/api");
     * const account = Account.fromCiphertext("ciphertext", "password");
     *
     * // Get a record from the network
     * const record = connection.getBlock(1234);
     * const recordCipherText = record.transactions[0].execution.transitions[0].id;
     *
     * // Check if the account owns the record
     * if account.ownsRecord(recordCipherText) {
     *     // Then one can do something like:
     *     // Decrypt the record and check if it's spent
     *     // Store the record in a local database
     *     // Etc.
     * }
     */
    ownsRecordCiphertext(ciphertext) {
        if (typeof ciphertext === 'string') {
            try {
                const ciphertextObject = RecordCiphertext.fromString(ciphertext);
                return ciphertextObject.isOwner(this._viewKey);
            }
            catch (e) {
                return false;
            }
        }
        else {
            return ciphertext.isOwner(this._viewKey);
        }
    }
    /**
     * Signs a message with the account's private key.
     * Returns a Signature.
     *
     * @param {Uint8Array} message
     * @returns {Signature}
     *
     * @example
     * const account = new Account();
     * const message = Uint8Array.from([104, 101, 108, 108, 111 119, 111, 114, 108, 100])
     * account.sign(message);
     */
    sign(message) {
        return this._privateKey.sign(message);
    }
    /**
     * Verifies the Signature on a message.
     *
     * @param {Uint8Array} message
     * @param {Signature} signature
     * @returns {boolean}
     *
     * @example
     * const account = new Account();
     * const message = Uint8Array.from([104, 101, 108, 108, 111 119, 111, 114, 108, 100])
     * const signature = account.sign(message);
     * account.verify(message, signature);
     */
    verify(message, signature) {
        return this._address.verify(message, signature);
    }
}

async function get(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(response.status + " could not get URL " + url);
    }
    return response;
}
async function post(url, options) {
    options.method = "POST";
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(response.status + " could not post URL " + url);
    }
    return response;
}

/**
 * Client library that encapsulates REST calls to publicly exposed endpoints of Aleo nodes. The methods provided in this
 * allow users to query public information from the Aleo blockchain and submit transactions to the network.
 *
 * @param {string} host
 * @example
 * // Connection to a local node
 * const localNetworkClient = new AleoNetworkClient("http://localhost:3030");
 *
 * // Connection to a public beacon node
 * const publicnetworkClient = new AleoNetworkClient("https://api.explorer.aleo.org/v1");
 */
class AleoNetworkClient {
    host;
    account;
    constructor(host) {
        this.host = host + "/testnet3";
    }
    /**
     * Set an account to use in networkClient calls
     *
     * @param {Account} account
     * @example
     * const account = new Account();
     * networkClient.setAccount(account);
     */
    setAccount(account) {
        this.account = account;
    }
    /**
     * Return the Aleo account used in the networkClient
     *
     * @example
     * const account = networkClient.getAccount();
     */
    getAccount() {
        return this.account;
    }
    /**
     * Set a new host for the networkClient
     *
     * @param {string} host The address of a node hosting the Aleo API
     * @param host
     */
    setHost(host) {
        this.host = host + "/testnet3";
    }
    async fetchData(url = "/") {
        try {
            const response = await get(this.host + url);
            return await response.json();
        }
        catch (error) {
            throw new Error("Error fetching data.");
        }
    }
    /**
     * Attempts to find unspent records in the Aleo blockchain for a specified private key
     * @param {number} startHeight - The height at which to start searching for unspent records
     * @param {number} endHeight - The height at which to stop searching for unspent records
     * @param {string | PrivateKey} privateKey - The private key to use to find unspent records
     * @param {number[]} amounts - The amounts (in microcredits) to search for (eg. [100, 200, 3000])
     * @param {number} maxMicrocredits - The maximum number of microcredits to search for
     * @param {string[]} nonces - The nonces of already found records to exclude from the search
     *
     * @example
     * // Find all unspent records
     * const privateKey = "[PRIVATE_KEY]";
     * const records = networkClient.findUnspentRecords(0, undefined, privateKey);
     *
     * // Find specific amounts
     * const startHeight = 500000;
     * const amounts = [600000, 1000000];
     * const records = networkClient.findUnspentRecords(startHeight, undefined, privateKey, amounts);
     *
     * // Find specific amounts with a maximum number of cumulative microcredits
     * const maxMicrocredits = 100000;
     * const records = networkClient.findUnspentRecords(startHeight, undefined, privateKey, undefined, maxMicrocredits);
     */
    async findUnspentRecords(startHeight, endHeight, privateKey, amounts, maxMicrocredits, nonces) {
        nonces = nonces || [];
        // Ensure start height is not negative
        if (startHeight < 0) {
            throw new Error("Start height must be greater than or equal to 0");
        }
        // Initialize search parameters
        const records = new Array();
        let start;
        let end;
        let resolvedPrivateKey;
        let failures = 0;
        let totalRecordValue = BigInt(0);
        let latestHeight;
        // Ensure a private key is present to find owned records
        if (typeof privateKey === "undefined") {
            if (typeof this.account === "undefined") {
                throw new Error("Private key must be specified in an argument to findOwnedRecords or set in the AleoNetworkClient");
            }
            else {
                resolvedPrivateKey = this.account._privateKey;
            }
        }
        else {
            try {
                resolvedPrivateKey = privateKey instanceof PrivateKey ? privateKey : PrivateKey.from_string(privateKey);
            }
            catch (error) {
                throw new Error("Error parsing private key provided.");
            }
        }
        const viewKey = resolvedPrivateKey.to_view_key();
        // Get the latest height to ensure the range being searched is valid
        try {
            const blockHeight = await this.getLatestHeight();
            if (typeof blockHeight === "number") {
                latestHeight = blockHeight;
            }
            else {
                throw new Error("Error fetching latest block height.");
            }
        }
        catch (error) {
            throw new Error("Error fetching latest block height.");
        }
        // If no end height is specified or is greater than the latest height, set the end height to the latest height
        if (typeof endHeight === "number" && endHeight <= latestHeight) {
            end = endHeight;
        }
        else {
            end = latestHeight;
        }
        // If the starting is greater than the ending height, return an error
        if (startHeight > end) {
            throw new Error("Start height must be less than or equal to end height.");
        }
        // Iterate through blocks in reverse order in chunks of 50
        while (end > startHeight) {
            start = end - 50;
            if (start < startHeight) {
                start = startHeight;
            }
            try {
                // Get 50 blocks (or the difference between the start and end if less than 50)
                const blocks = await this.getBlockRange(start, end);
                end = start;
                if (!(blocks instanceof Error)) {
                    // Iterate through blocks to find unspent records
                    for (let i = 0; i < blocks.length; i++) {
                        const block = blocks[i];
                        const transactions = block.transactions;
                        if (!(typeof transactions === "undefined")) {
                            for (let j = 0; j < transactions.length; j++) {
                                const confirmedTransaction = transactions[j];
                                // Search for unspent records in execute transactions of credits.aleo
                                if (confirmedTransaction.type == "execute") {
                                    const transaction = confirmedTransaction.transaction;
                                    if (transaction.execution && !(typeof transaction.execution.transitions == "undefined")) {
                                        for (let k = 0; k < transaction.execution.transitions.length; k++) {
                                            const transition = transaction.execution.transitions[k];
                                            // Only search for unspent records in credits.aleo (for now)
                                            if (transition.program !== "credits.aleo") {
                                                continue;
                                            }
                                            if (!(typeof transition.outputs == "undefined")) {
                                                for (let l = 0; l < transition.outputs.length; l++) {
                                                    const output = transition.outputs[l];
                                                    if (output.type === "record") {
                                                        try {
                                                            // Create a wasm record ciphertext object from the found output
                                                            const record = RecordCiphertext.fromString(output.value);
                                                            // Determine if the record is owned by the specified view key
                                                            if (record.isOwner(viewKey)) {
                                                                // Decrypt the record and get the serial number
                                                                const recordPlaintext = record.decrypt(viewKey);
                                                                // If the record has already been found, skip it
                                                                const nonce = recordPlaintext.nonce();
                                                                if (nonces.includes(nonce)) {
                                                                    continue;
                                                                }
                                                                // Otherwise record the nonce that has been found
                                                                const serialNumber = recordPlaintext.serialNumberString(resolvedPrivateKey, "credits.aleo", "credits");
                                                                // Attempt to see if the serial number is spent
                                                                try {
                                                                    await this.getTransitionId(serialNumber);
                                                                }
                                                                catch (error) {
                                                                    // If it's not found, add it to the list of unspent records
                                                                    if (!amounts) {
                                                                        records.push(recordPlaintext);
                                                                        // If the user specified a maximum number of microcredits, check if the search has found enough
                                                                        if (typeof maxMicrocredits === "number") {
                                                                            totalRecordValue += recordPlaintext.microcredits();
                                                                            // Exit if the search has found the amount specified
                                                                            if (totalRecordValue >= BigInt(maxMicrocredits)) {
                                                                                return records;
                                                                            }
                                                                        }
                                                                    }
                                                                    // If the user specified a list of amounts, check if the search has found them
                                                                    if (!(typeof amounts === "undefined") && amounts.length > 0) {
                                                                        let amounts_found = 0;
                                                                        if (recordPlaintext.microcredits() > amounts[amounts_found]) {
                                                                            amounts_found += 1;
                                                                            records.push(recordPlaintext);
                                                                            // If the user specified a maximum number of microcredits, check if the search has found enough
                                                                            if (typeof maxMicrocredits === "number") {
                                                                                totalRecordValue += recordPlaintext.microcredits();
                                                                                // Exit if the search has found the amount specified
                                                                                if (totalRecordValue >= BigInt(maxMicrocredits)) {
                                                                                    return records;
                                                                                }
                                                                            }
                                                                            if (records.length >= amounts.length) {
                                                                                return records;
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                        catch (error) {
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            catch (error) {
                // If there is an error fetching blocks, log it and keep searching
                console.warn("Error fetching blocks in range: " + start.toString() + "-" + end.toString());
                console.warn("Error: ", error);
                failures += 1;
                if (failures > 10) {
                    console.warn("10 failures fetching records reached. Returning records fetched so far");
                    return records;
                }
            }
        }
        return records;
    }
    /**
     * Returns the contents of the block at the specified block height
     *
     * @param {number} height
     * @example
     * const block = networkClient.getBlock(1234);
     */
    async getBlock(height) {
        try {
            const block = await this.fetchData("/block/" + height);
            return block;
        }
        catch (error) {
            throw new Error("Error fetching block.");
        }
    }
    /**
     * Returns a range of blocks between the specified block heights
     *
     * @param {number} start
     * @param {number} end
     * @example
     * const blockRange = networkClient.getBlockRange(2050, 2100);
     */
    async getBlockRange(start, end) {
        try {
            return await this.fetchData("/blocks?start=" + start + "&end=" + end);
        }
        catch (error) {
            const errorMessage = "Error fetching blocks between " + start + " and " + end + ".";
            throw new Error(errorMessage);
        }
    }
    /**
     * Returns the deployment transaction id associated with the specified program
     *
     * @param {Program | string} program
     * @returns {TransactionModel | Error}
     */
    async getDeploymentTransactionIDForProgram(program) {
        if (program instanceof Program) {
            program = program.toString();
        }
        try {
            const id = await this.fetchData("/find/transactionID/deployment/" + program);
            return id.replace("\"", "");
        }
        catch (error) {
            throw new Error("Error fetching deployment transaction for program.");
        }
    }
    /**
     * Returns the deployment transaction associated with a specified program
     *
     * @param {Program | string} program
     * @returns {TransactionModel | Error}
     */
    async getDeploymentTransactionForProgram(program) {
        try {
            const transaction_id = await this.getDeploymentTransactionIDForProgram(program);
            return await this.getTransaction(transaction_id);
        }
        catch (error) {
            throw new Error("Error fetching deployment transaction for program.");
        }
    }
    /**
     * Returns the contents of the latest block
     *
     * @example
     * const latestHeight = networkClient.getLatestBlock();
     */
    async getLatestBlock() {
        try {
            return await this.fetchData("/latest/block");
        }
        catch (error) {
            throw new Error("Error fetching latest block.");
        }
    }
    /**
     * Returns the latest committee
     *
     * @returns {Promise<object>} A javascript object containing the latest committee
     */
    async getLatestCommittee() {
        try {
            return await this.fetchData("/committee/latest");
        }
        catch (error) {
            throw new Error("Error fetching latest block.");
        }
    }
    /**
     * Returns the latest block height
     *
     * @example
     * const latestHeight = networkClient.getLatestHeight();
     */
    async getLatestHeight() {
        try {
            return await this.fetchData("/latest/height");
        }
        catch (error) {
            throw new Error("Error fetching latest height.");
        }
    }
    /**
     * Returns the source code of a program given a program ID
     *
     * @param {string} programId The program ID of a program deployed to the Aleo Network
     * @return {Promise<string>} Source code of the program
     *
     * @example
     * const program = networkClient.getProgram("hello_hello.aleo");
     * const expectedSource = "program hello_hello.aleo;\n\nfunction hello:\n    input r0 as u32.public;\n    input r1 as u32.private;\n    add r0 r1 into r2;\n    output r2 as u32.private;\n"
     * assert.equal(program, expectedSource);
     */
    async getProgram(programId) {
        try {
            return await this.fetchData("/program/" + programId);
        }
        catch (error) {
            throw new Error("Error fetching program");
        }
    }
    /**
     * Returns a program object from a program ID or program source code
     *
     * @param {string} inputProgram The program ID or program source code of a program deployed to the Aleo Network
     * @return {Promise<Program | Error>} Source code of the program
     *
     * @example
     * const programID = "hello_hello.aleo";
     * const programSource = "program hello_hello.aleo;\n\nfunction hello:\n    input r0 as u32.public;\n    input r1 as u32.private;\n    add r0 r1 into r2;\n    output r2 as u32.private;\n"
     *
     * // Get program object from program ID or program source code
     * const programObjectFromID = await networkClient.getProgramObject(programID);
     * const programObjectFromSource = await networkClient.getProgramObject(programSource);
     *
     * // Both program objects should be equal
     * assert.equal(programObjectFromID.to_string(), programObjectFromSource.to_string());
     */
    async getProgramObject(inputProgram) {
        try {
            return Program.fromString(inputProgram);
        }
        catch (error) {
            try {
                return Program.fromString((await this.getProgram(inputProgram)));
            }
            catch (error) {
                throw new Error(`${inputProgram} is neither a program name or a valid program`);
            }
        }
    }
    /**
     *  Returns an object containing the source code of a program and the source code of all programs it imports
     *
     * @param {Program | string} inputProgram The program ID or program source code of a program deployed to the Aleo Network
     * @returns {Promise<ProgramImports>} Object of the form { "program_id": "program_source", .. } containing program id & source code for all program imports
     *
     * @example
     * const double_test_source = "import multiply_test.aleo;\n\nprogram double_test.aleo;\n\nfunction double_it:\n    input r0 as u32.private;\n    call multiply_test.aleo/multiply 2u32 r0 into r1;\n    output r1 as u32.private;\n"
     * const double_test = Program.fromString(double_test_source);
     * const expectedImports = {
     *     "multiply_test.aleo": "program multiply_test.aleo;\n\nfunction multiply:\n    input r0 as u32.public;\n    input r1 as u32.private;\n    mul r0 r1 into r2;\n    output r2 as u32.private;\n"
     * }
     *
     * // Imports can be fetched using the program ID, source code, or program object
     * let programImports = await networkClient.getProgramImports("double_test.aleo");
     * assert.deepStrictEqual(programImports, expectedImports);
     *
     * // Using the program source code
     * programImports = await networkClient.getProgramImports(double_test_source);
     * assert.deepStrictEqual(programImports, expectedImports);
     *
     * // Using the program object
     * programImports = await networkClient.getProgramImports(double_test);
     * assert.deepStrictEqual(programImports, expectedImports);
     */
    async getProgramImports(inputProgram) {
        try {
            const imports = {};
            // Get the program object or fail if the program is not valid or does not exist
            const program = inputProgram instanceof Program ? inputProgram : (await this.getProgramObject(inputProgram));
            // Get the list of programs that the program imports
            const importList = program.getImports();
            // Recursively get any imports that the imported programs have in a depth first search order
            for (let i = 0; i < importList.length; i++) {
                const import_id = importList[i];
                if (!imports.hasOwnProperty(import_id)) {
                    const programSource = await this.getProgram(import_id);
                    const nestedImports = await this.getProgramImports(import_id);
                    for (const key in nestedImports) {
                        if (!imports.hasOwnProperty(key)) {
                            imports[key] = nestedImports[key];
                        }
                    }
                    imports[import_id] = programSource;
                }
            }
            return imports;
        }
        catch (error) {
            throw logAndThrow("Error fetching program imports: " + error);
        }
    }
    /**
     * Get a list of the program names that a program imports
     *
     * @param {Program | string} inputProgram - The program id or program source code to get the imports of
     * @returns {string[]} - The list of program names that the program imports
     *
     * @example
     * const programImportsNames = networkClient.getProgramImports("double_test.aleo");
     * const expectedImportsNames = ["multiply_test.aleo"];
     * assert.deepStrictEqual(programImportsNames, expectedImportsNames);
     */
    async getProgramImportNames(inputProgram) {
        try {
            const program = inputProgram instanceof Program ? inputProgram : (await this.getProgramObject(inputProgram));
            return program.getImports();
        }
        catch (error) {
            throw new Error("Error fetching program imports with error: " + error);
        }
    }
    /**
     * Returns the names of the mappings of a program
     *
     * @param {string} programId - The program ID to get the mappings of (e.g. "credits.aleo")
     * @example
     * const mappings = networkClient.getProgramMappingNames("credits.aleo");
     * const expectedMappings = ["account"];
     * assert.deepStrictEqual(mappings, expectedMappings);
     */
    async getProgramMappingNames(programId) {
        try {
            return await this.fetchData("/program/" + programId + "/mappings");
        }
        catch (error) {
            throw new Error("Error fetching program mappings - ensure the program exists on chain before trying again");
        }
    }
    /**
     * Returns the value of a program's mapping for a specific key
     *
     * @param {string} programId - The program ID to get the mapping value of (e.g. "credits.aleo")
     * @param {string} mappingName - The name of the mapping to get the value of (e.g. "account")
     * @param {string} key - The key of the mapping to get the value of (e.g. "aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px")
     * @return {Promise<string>} String representation of the value of the mapping
     *
     * @example
     * // Get public balance of an account
     * const mappingValue = networkClient.getMappingValue("credits.aleo", "account", "aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px");
     * const expectedValue = "0u64";
     * assert.equal(mappingValue, expectedValue);
     */
    async getProgramMappingValue(programId, mappingName, key) {
        try {
            return await this.fetchData("/program/" + programId + "/mapping/" + mappingName + "/" + key);
        }
        catch (error) {
            throw new Error("Error fetching mapping value - ensure the mapping exists and the key is correct");
        }
    }
    /**
     * Returns the latest state/merkle root of the Aleo blockchain
     *
     * @example
     * const stateRoot = networkClient.getStateRoot();
     */
    async getStateRoot() {
        try {
            return await this.fetchData("/latest/stateRoot");
        }
        catch (error) {
            throw new Error("Error fetching Aleo state root");
        }
    }
    /**
     * Returns a transaction by its unique identifier
     *
     * @param {string} id
     * @example
     * const transaction = networkClient.getTransaction("at1handz9xjrqeynjrr0xay4pcsgtnczdksz3e584vfsgaz0dh0lyxq43a4wj");
     */
    async getTransaction(id) {
        try {
            return await this.fetchData("/transaction/" + id);
        }
        catch (error) {
            throw new Error("Error fetching transaction.");
        }
    }
    /**
     * Returns the transactions present at the specified block height
     *
     * @param {number} height
     * @example
     * const transactions = networkClient.getTransactions(654);
     */
    async getTransactions(height) {
        try {
            return await this.fetchData("/block/" + height.toString() + "/transactions");
        }
        catch (error) {
            throw new Error("Error fetching transactions.");
        }
    }
    /**
     * Returns the transactions in the memory pool.
     *
     * @example
     * const transactions = networkClient.getTransactionsInMempool();
     */
    async getTransactionsInMempool() {
        try {
            return await this.fetchData("/memoryPool/transactions");
        }
        catch (error) {
            throw new Error("Error fetching transactions from mempool.");
        }
    }
    /**
     * Returns the transition ID of the transition corresponding to the ID of the input or output.
     * @param {string} inputOrOutputID - ID of the input or output.
     *
     * @example
     * const transitionId = networkClient.getTransitionId("2429232855236830926144356377868449890830704336664550203176918782554219952323field");
     */
    async getTransitionId(inputOrOutputID) {
        try {
            return await this.fetchData("/find/transitionID/" + inputOrOutputID);
        }
        catch (error) {
            throw new Error("Error fetching transition ID.");
        }
    }
    /**
     * Submit an execute or deployment transaction to the Aleo network
     *
     * @param {Transaction | string} transaction  - The transaction to submit to the network
     * @returns {string | Error} - The transaction id of the submitted transaction or the resulting error
     */
    async submitTransaction(transaction) {
        const transaction_string = transaction instanceof Transaction ? transaction.toString() : transaction;
        try {
            const response = await post(this.host + "/transaction/broadcast", {
                body: transaction_string,
                headers: {
                    "Content-Type": "application/json",
                },
            });
            try {
                return await response.json();
            }
            catch (error) {
                throw new Error(`Error posting transaction. Aleo network response: ${error.message}`);
            }
        }
        catch (error) {
            throw new Error(`Error posting transaction: No response received: ${error.message}`);
        }
    }
}

/**
 * AleoKeyProviderParams search parameter for the AleoKeyProvider. It allows for the specification of a proverUri and
 * verifierUri to fetch keys via HTTP from a remote resource as well as a unique cacheKey to store the keys in memory.
 */
class AleoKeyProviderParams {
    proverUri;
    verifierUri;
    cacheKey;
    /**
     * Create a new AleoKeyProviderParams object which implements the KeySearchParams interface. Users can optionally
     * specify a url for the proverUri & verifierUri to fetch keys via HTTP from a remote resource as well as a unique
     * cacheKey to store the keys in memory for future use. If no proverUri or verifierUri is specified, a cachekey must
     * be provided.
     *
     * @param { AleoKeyProviderInitParams } params - Optional search parameters
     */
    constructor(params) {
        this.proverUri = params.proverUri;
        this.verifierUri = params.verifierUri;
        this.cacheKey = params.cacheKey;
    }
}
/**
 * AleoKeyProvider class. Implements the KeyProvider interface. Enables the retrieval of Aleo program proving and
 * verifying keys for the credits.aleo program over http from official Aleo sources and storing and retrieving function
 * keys from a local memory cache.
 */
class AleoKeyProvider {
    cache;
    cacheOption;
    keyUris;
    async fetchBytes(url = "/") {
        try {
            const response = await get(url);
            const data = await response.arrayBuffer();
            return new Uint8Array(data);
        }
        catch (error) {
            throw new Error("Error fetching data." + error);
        }
    }
    constructor() {
        this.keyUris = KEY_STORE;
        this.cache = new Map();
        this.cacheOption = false;
    }
    /**
     * Use local memory to store keys
     *
     * @param {boolean} useCache whether to store keys in local memory
     */
    useCache(useCache) {
        this.cacheOption = useCache;
    }
    /**
     * Clear the key cache
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Cache a set of keys. This will overwrite any existing keys with the same keyId. The user can check if a keyId
     * exists in the cache using the containsKeys method prior to calling this method if overwriting is not desired.
     *
     * @param {string} keyId access key for the cache
     * @param {FunctionKeyPair} keys keys to cache
     */
    cacheKeys(keyId, keys) {
        const [provingKey, verifyingKey] = keys;
        this.cache.set(keyId, [provingKey.toBytes(), verifyingKey.toBytes()]);
    }
    /**
     * Determine if a keyId exists in the cache
     *
     * @param {string} keyId keyId of a proving and verifying key pair
     * @returns {boolean} true if the keyId exists in the cache, false otherwise
     */
    containsKeys(keyId) {
        return this.cache.has(keyId);
    }
    /**
     * Delete a set of keys from the cache
     *
     * @param {string} keyId keyId of a proving and verifying key pair to delete from memory
     * @returns {boolean} true if the keyId exists in the cache and was deleted, false if the key did not exist
     */
    deleteKeys(keyId) {
        return this.cache.delete(keyId);
    }
    /**
     * Get a set of keys from the cache
     * @param keyId keyId of a proving and verifying key pair
     *
     * @returns {FunctionKeyPair | Error} Proving and verifying keys for the specified program
     */
    getKeys(keyId) {
        console.debug(`Checking if key exists in cache. KeyId: ${keyId}`);
        if (this.cache.has(keyId)) {
            const [provingKeyBytes, verifyingKeyBytes] = this.cache.get(keyId);
            return [ProvingKey.fromBytes(provingKeyBytes), VerifyingKey.fromBytes(verifyingKeyBytes)];
        }
        else {
            return new Error("Key not found in cache.");
        }
    }
    /**
     * Get arbitrary function keys from a provider
     *
     * @param {KeySearchParams} params parameters for the key search in form of: {proverUri: string, verifierUri: string, cacheKey: string}
     * @returns {Promise<FunctionKeyPair | Error>} Proving and verifying keys for the specified program
     *
     * @example
     * // Create a new object which implements the KeyProvider interface
     * const networkClient = new AleoNetworkClient("https://api.explorer.aleo.org/v1");
     * const keyProvider = new AleoKeyProvider();
     * const recordProvider = new NetworkRecordProvider(account, networkClient);
     * const AleoProviderParams = new AleoProviderParams("https://testnet3.parameters.aleo.org/transfer_private.");
     *
     * // Initialize a program manager with the key provider to automatically fetch keys for value transfers
     * const programManager = new ProgramManager("https://api.explorer.aleo.org/v1", keyProvider, recordProvider);
     * programManager.transfer(1, "aleo166q6ww6688cug7qxwe7nhctjpymydwzy2h7rscfmatqmfwnjvggqcad0at", "public", 0.5);
     *
     * // Keys can also be fetched manually using the key provider
     * const keySearchParams = { "cacheKey": "myProgram:myFunction" };
     * const [transferPrivateProvingKey, transferPrivateVerifyingKey] = await keyProvider.functionKeys(keySearchParams);
     */
    async functionKeys(params) {
        if (params) {
            let proverUrl;
            let verifierUrl;
            let cacheKey;
            if ("proverUri" in params && typeof params["proverUri"] == "string") {
                proverUrl = params["proverUri"];
            }
            if ("verifierUri" in params && typeof params["verifierUri"] == "string") {
                verifierUrl = params["verifierUri"];
            }
            if ("cacheKey" in params && typeof params["cacheKey"] == "string") {
                cacheKey = params["cacheKey"];
            }
            if (proverUrl && verifierUrl) {
                return await this.fetchKeys(proverUrl, verifierUrl, cacheKey);
            }
            if (cacheKey) {
                return this.getKeys(cacheKey);
            }
        }
        throw Error("Invalid parameters provided, must provide either a cacheKey and/or a proverUrl and a verifierUrl");
    }
    /**
     * Returns the proving and verifying keys for a specified program from a specified url.
     *
     * @param {string} verifierUrl Url of the proving key
     * @param {string} proverUrl Url the verifying key
     * @param {string} cacheKey Key to store the keys in the cache
     *
     * @returns {Promise<FunctionKeyPair | Error>} Proving and verifying keys for the specified program
     *
     * @example
     * // Create a new AleoKeyProvider object
     * const networkClient = new AleoNetworkClient("https://api.explorer.aleo.org/v1");
     * const keyProvider = new AleoKeyProvider();
     * const recordProvider = new NetworkRecordProvider(account, networkClient);
     *
     * // Initialize a program manager with the key provider to automatically fetch keys for value transfers
     * const programManager = new ProgramManager("https://vm.aleo.org/api", keyProvider, recordProvider);
     * programManager.transfer(1, "aleo166q6ww6688cug7qxwe7nhctjpymydwzy2h7rscfmatqmfwnjvggqcad0at", "public", 0.5);
     *
     * // Keys can also be fetched manually
     * const [transferPrivateProvingKey, transferPrivateVerifyingKey] = await keyProvider.fetchKeys("https://testnet3.parameters.aleo.org/transfer_private.prover.2a9a6f2", "https://testnet3.parameters.aleo.org/transfer_private.verifier.3a59762");
     */
    async fetchKeys(proverUrl, verifierUrl, cacheKey) {
        try {
            // If cache is enabled, check if the keys have already been fetched and return them if they have
            if (this.cacheOption) {
                if (!cacheKey) {
                    cacheKey = proverUrl;
                }
                const value = this.cache.get(cacheKey);
                if (typeof value !== "undefined") {
                    return [ProvingKey.fromBytes(value[0]), VerifyingKey.fromBytes(value[1])];
                }
                else {
                    console.debug("Fetching proving keys from url " + proverUrl);
                    const provingKey = ProvingKey.fromBytes(await this.fetchBytes(proverUrl));
                    console.debug("Fetching verifying keys " + verifierUrl);
                    const verifyingKey = (await this.getVerifyingKey(verifierUrl));
                    this.cache.set(cacheKey, [provingKey.toBytes(), verifyingKey.toBytes()]);
                    return [provingKey, verifyingKey];
                }
            }
            else {
                // If cache is disabled, fetch the keys and return them
                const provingKey = ProvingKey.fromBytes(await this.fetchBytes(proverUrl));
                const verifyingKey = (await this.getVerifyingKey(verifierUrl));
                return [provingKey, verifyingKey];
            }
        }
        catch (error) {
            throw new Error(`Error: ${error} fetching fee proving and verifying keys from ${proverUrl} and ${verifierUrl}.`);
        }
    }
    bondPublicKeys() {
        return this.fetchKeys(CREDITS_PROGRAM_KEYS.bond_public.prover, CREDITS_PROGRAM_KEYS.bond_public.verifier, CREDITS_PROGRAM_KEYS.bond_public.locator);
    }
    claimUnbondPublicKeys() {
        return this.fetchKeys(CREDITS_PROGRAM_KEYS.claim_unbond_public.prover, CREDITS_PROGRAM_KEYS.claim_unbond_public.verifier, CREDITS_PROGRAM_KEYS.claim_unbond_public.locator);
    }
    /**
     * Returns the proving and verifying keys for the transfer functions in the credits.aleo program
     * @param {string} visibility Visibility of the transfer function
     * @returns {Promise<FunctionKeyPair | Error>} Proving and verifying keys for the transfer functions
     *
     * @example
     * // Create a new AleoKeyProvider
     * const networkClient = new AleoNetworkClient("https://vm.aleo.org/api");
     * const keyProvider = new AleoKeyProvider();
     * const recordProvider = new NetworkRecordProvider(account, networkClient);
     *
     * // Initialize a program manager with the key provider to automatically fetch keys for value transfers
     * const programManager = new ProgramManager("https://vm.aleo.org/api", keyProvider, recordProvider);
     * programManager.transfer(1, "aleo166q6ww6688cug7qxwe7nhctjpymydwzy2h7rscfmatqmfwnjvggqcad0at", "public", 0.5);
     *
     * // Keys can also be fetched manually
     * const [transferPublicProvingKey, transferPublicVerifyingKey] = await keyProvider.transferKeys("public");
     */
    async transferKeys(visibility) {
        if (PRIVATE_TRANSFER.has(visibility)) {
            return await this.fetchKeys(CREDITS_PROGRAM_KEYS.transfer_private.prover, CREDITS_PROGRAM_KEYS.transfer_private.verifier, CREDITS_PROGRAM_KEYS.transfer_private.locator);
        }
        else if (PRIVATE_TO_PUBLIC_TRANSFER.has(visibility)) {
            return await this.fetchKeys(CREDITS_PROGRAM_KEYS.transfer_private_to_public.prover, CREDITS_PROGRAM_KEYS.transfer_private_to_public.verifier, CREDITS_PROGRAM_KEYS.transfer_private_to_public.locator);
        }
        else if (PUBLIC_TRANSFER.has(visibility)) {
            return await this.fetchKeys(CREDITS_PROGRAM_KEYS.transfer_public.prover, CREDITS_PROGRAM_KEYS.transfer_public.verifier, CREDITS_PROGRAM_KEYS.transfer_public.locator);
        }
        else if (PUBLIC_TO_PRIVATE_TRANSFER.has(visibility)) {
            return await this.fetchKeys(CREDITS_PROGRAM_KEYS.transfer_public_to_private.prover, CREDITS_PROGRAM_KEYS.transfer_public_to_private.verifier, CREDITS_PROGRAM_KEYS.transfer_public_to_private.locator);
        }
        else {
            throw new Error("Invalid visibility type");
        }
    }
    /**
     * Returns the proving and verifying keys for the join function in the credits.aleo program
     *
     * @returns {Promise<FunctionKeyPair | Error>} Proving and verifying keys for the join function
     */
    async joinKeys() {
        return await this.fetchKeys(CREDITS_PROGRAM_KEYS.join.prover, CREDITS_PROGRAM_KEYS.join.verifier, CREDITS_PROGRAM_KEYS.join.locator);
    }
    /**
     * Returns the proving and verifying keys for the split function in the credits.aleo program
     *
     * @returns {Promise<FunctionKeyPair | Error>} Proving and verifying keys for the split function
     * */
    async splitKeys() {
        return await this.fetchKeys(CREDITS_PROGRAM_KEYS.split.prover, CREDITS_PROGRAM_KEYS.split.verifier, CREDITS_PROGRAM_KEYS.split.locator);
    }
    /**
     * Returns the proving and verifying keys for the fee_private function in the credits.aleo program
     *
     * @returns {Promise<FunctionKeyPair | Error>} Proving and verifying keys for the fee function
     */
    async feePrivateKeys() {
        return await this.fetchKeys(CREDITS_PROGRAM_KEYS.fee_private.prover, CREDITS_PROGRAM_KEYS.fee_private.verifier, CREDITS_PROGRAM_KEYS.fee_private.locator);
    }
    /**
     * Returns the proving and verifying keys for the fee_public function in the credits.aleo program
     *
     * @returns {Promise<FunctionKeyPair | Error>} Proving and verifying keys for the fee function
     */
    async feePublicKeys() {
        return await this.fetchKeys(CREDITS_PROGRAM_KEYS.fee_public.prover, CREDITS_PROGRAM_KEYS.fee_public.verifier, CREDITS_PROGRAM_KEYS.fee_public.locator);
    }
    /**
     * Gets a verifying key. If the verifying key is for a credits.aleo function, get it from the wasm cache otherwise
     *
     * @returns {Promise<VerifyingKey | Error>} Verifying key for the function
     */
    // attempt to fetch it from the network
    async getVerifyingKey(verifierUri) {
        switch (verifierUri) {
            case CREDITS_PROGRAM_KEYS.bond_public.verifier:
                return CREDITS_PROGRAM_KEYS.bond_public.verifyingKey();
            case CREDITS_PROGRAM_KEYS.claim_unbond_public.verifier:
                return CREDITS_PROGRAM_KEYS.claim_unbond_public.verifyingKey();
            case CREDITS_PROGRAM_KEYS.fee_private.verifier:
                return CREDITS_PROGRAM_KEYS.fee_private.verifyingKey();
            case CREDITS_PROGRAM_KEYS.fee_public.verifier:
                return CREDITS_PROGRAM_KEYS.fee_public.verifyingKey();
            case CREDITS_PROGRAM_KEYS.inclusion.verifier:
                return CREDITS_PROGRAM_KEYS.inclusion.verifyingKey();
            case CREDITS_PROGRAM_KEYS.join.verifier:
                return CREDITS_PROGRAM_KEYS.join.verifyingKey();
            case CREDITS_PROGRAM_KEYS.set_validator_state.verifier:
                return CREDITS_PROGRAM_KEYS.set_validator_state.verifyingKey();
            case CREDITS_PROGRAM_KEYS.split.verifier:
                return CREDITS_PROGRAM_KEYS.split.verifyingKey();
            case CREDITS_PROGRAM_KEYS.transfer_private.verifier:
                return CREDITS_PROGRAM_KEYS.transfer_private.verifyingKey();
            case CREDITS_PROGRAM_KEYS.transfer_private_to_public.verifier:
                return CREDITS_PROGRAM_KEYS.transfer_private_to_public.verifyingKey();
            case CREDITS_PROGRAM_KEYS.transfer_public.verifier:
                return CREDITS_PROGRAM_KEYS.transfer_public.verifyingKey();
            case CREDITS_PROGRAM_KEYS.transfer_public_to_private.verifier:
                return CREDITS_PROGRAM_KEYS.transfer_public_to_private.verifyingKey();
            case CREDITS_PROGRAM_KEYS.unbond_delegator_as_validator.verifier:
                return CREDITS_PROGRAM_KEYS.unbond_delegator_as_validator.verifyingKey();
            case CREDITS_PROGRAM_KEYS.unbond_public.verifier:
                return CREDITS_PROGRAM_KEYS.unbond_public.verifyingKey();
            default:
                try {
                    /// Try to fetch the verifying key from the network as a string
                    const response = await get(verifierUri);
                    const text = await response.text();
                    return VerifyingKey.fromString(text);
                }
                catch (e) {
                    /// If that fails, try to fetch the verifying key from the network as bytes
                    try {
                        return VerifyingKey.fromBytes(await this.fetchBytes(verifierUri));
                    }
                    catch (inner) {
                        return new Error("Invalid verifying key. Error: " + inner);
                    }
                }
        }
    }
    unBondPublicKeys() {
        return this.fetchKeys(CREDITS_PROGRAM_KEYS.unbond_public.prover, CREDITS_PROGRAM_KEYS.unbond_public.verifier, CREDITS_PROGRAM_KEYS.unbond_public.locator);
    }
}

/**
 * Search parameters for the offline key provider. This class implements the KeySearchParams interface and includes
 * a convenience method for creating a new instance of this class for each function of the credits.aleo program.
 *
 * @example
 * // If storing a key for a custom program function
 * offlineSearchParams = new OfflineSearchParams("myprogram.aleo/myfunction");
 *
 * // If storing a key for a credits.aleo program function
 * unbondDelegatorAsValidatorSearchParams = OfflineSearchParams.unbondDelegatorAsValidatorKeyParams();
 */
class OfflineSearchParams {
    cacheKey;
    verifyCreditsKeys;
    /**
     * Create a new OfflineSearchParams instance.
     *
     * @param {string} cacheKey - Key used to store the local function proving & verifying keys. This should be stored
     * under the naming convention "programName/functionName" (i.e. "myprogram.aleo/myfunction")
     * @param {boolean} verifyCreditsKeys - Whether to verify the keys against the credits.aleo program,
     * defaults to false, but should be set to true if using keys from the credits.aleo program
     */
    constructor(cacheKey, verifyCreditsKeys = false) {
        this.cacheKey = cacheKey;
        this.verifyCreditsKeys = verifyCreditsKeys;
    }
    /**
     * Create a new OfflineSearchParams instance for the bond_public function of the credits.aleo program.
     */
    static bondPublicKeyParams() {
        return new OfflineSearchParams(CREDITS_PROGRAM_KEYS.bond_public.locator, true);
    }
    /**
     * Create a new OfflineSearchParams instance for the claim_unbond_public function of the
     */
    static claimUnbondPublicKeyParams() {
        return new OfflineSearchParams(CREDITS_PROGRAM_KEYS.claim_unbond_public.locator, true);
    }
    /**
     * Create a new OfflineSearchParams instance for the fee_private function of the credits.aleo program.
     */
    static feePrivateKeyParams() {
        return new OfflineSearchParams(CREDITS_PROGRAM_KEYS.fee_private.locator, true);
    }
    /**
     * Create a new OfflineSearchParams instance for the fee_public function of the credits.aleo program.
     */
    static feePublicKeyParams() {
        return new OfflineSearchParams(CREDITS_PROGRAM_KEYS.fee_public.locator, true);
    }
    /**
     * Create a new OfflineSearchParams instance for the inclusion prover function.
     */
    static inclusionKeyParams() {
        return new OfflineSearchParams(CREDITS_PROGRAM_KEYS.inclusion.locator, true);
    }
    /**
     * Create a new OfflineSearchParams instance for the join function of the credits.aleo program.
     */
    static joinKeyParams() {
        return new OfflineSearchParams(CREDITS_PROGRAM_KEYS.join.locator, true);
    }
    /**
     * Create a new OfflineSearchParams instance for the set_validator_state function of the credits.aleo program.
     */
    static setValidatorStateKeyParams() {
        return new OfflineSearchParams(CREDITS_PROGRAM_KEYS.set_validator_state.locator, true);
    }
    /**
     * Create a new OfflineSearchParams instance for the split function of the credits.aleo program.
     */
    static splitKeyParams() {
        return new OfflineSearchParams(CREDITS_PROGRAM_KEYS.split.locator, true);
    }
    /**
     * Create a new OfflineSearchParams instance for the transfer_private function of the credits.aleo program.
     */
    static transferPrivateKeyParams() {
        return new OfflineSearchParams(CREDITS_PROGRAM_KEYS.transfer_private.locator, true);
    }
    /**
     * Create a new OfflineSearchParams instance for the transfer_private_to_public function of the credits.aleo program.
     */
    static transferPrivateToPublicKeyParams() {
        return new OfflineSearchParams(CREDITS_PROGRAM_KEYS.transfer_private_to_public.locator, true);
    }
    /**
     * Create a new OfflineSearchParams instance for the transfer_public function of the credits.aleo program.
     */
    static transferPublicKeyParams() {
        return new OfflineSearchParams(CREDITS_PROGRAM_KEYS.transfer_public.locator, true);
    }
    /**
     * Create a new OfflineSearchParams instance for the transfer_public_to_private function of the credits.aleo program.
     */
    static transferPublicToPrivateKeyParams() {
        return new OfflineSearchParams(CREDITS_PROGRAM_KEYS.transfer_public_to_private.locator, true);
    }
    /**
     * Create a new OfflineSearchParams instance for the unbond_delegator_as_validator function of the credits.aleo program.
     */
    static unbondDelegatorAsValidatorKeyParams() {
        return new OfflineSearchParams(CREDITS_PROGRAM_KEYS.unbond_delegator_as_validator.locator, true);
    }
    /**
     * Create a new OfflineSearchParams instance for the unbond_delegator function of the credits.aleo program.
     */
    static unbondPublicKeyParams() {
        return new OfflineSearchParams(CREDITS_PROGRAM_KEYS.unbond_public.locator, true);
    }
}
/**
 * A key provider meant for building transactions offline on devices such as hardware wallets. This key provider is not
 * able to contact the internet for key material and instead relies on the user to insert Aleo function proving &
 * verifying keys from local storage prior to usage.
 *
 * @example
 * // Create an offline program manager
 * const programManager = new ProgramManager();
 *
 * // Create a temporary account for the execution of the program
 * const account = new Account();
 * programManager.setAccount(account);
 *
 * // Create the proving keys from the key bytes on the offline machine
 * console.log("Creating proving keys from local key files");
 * const program = "program hello_hello.aleo; function hello: input r0 as u32.public; input r1 as u32.private; add r0 r1 into r2; output r2 as u32.private;";
 * const myFunctionProver = await getLocalKey("/path/to/my/function/hello_hello.prover");
 * const myFunctionVerifier = await getLocalKey("/path/to/my/function/hello_hello.verifier");
 * const feePublicProvingKeyBytes = await getLocalKey("/path/to/credits.aleo/feePublic.prover");
 *
 * myFunctionProvingKey = ProvingKey.fromBytes(myFunctionProver);
 * myFunctionVerifyingKey = VerifyingKey.fromBytes(myFunctionVerifier);
 * const feePublicProvingKey = ProvingKey.fromBytes(feePublicKeyBytes);
 *
 * // Create an offline key provider
 * console.log("Creating offline key provider");
 * const offlineKeyProvider = new OfflineKeyProvider();
 *
 * // Cache the keys
 * // Cache the proving and verifying keys for the custom hello function
 * OfflineKeyProvider.cacheKeys("hello_hello.aleo/hello", myFunctionProvingKey, myFunctionVerifyingKey);
 *
 * // Cache the proving key for the fee_public function (the verifying key is automatically cached)
 * OfflineKeyProvider.insertFeePublicKey(feePublicProvingKey);
 *
 * // Create an offline query using the latest state root in order to create the inclusion proof
 * const offlineQuery = new OfflineQuery("latestStateRoot");
 *
 * // Insert the key provider into the program manager
 * programManager.setKeyProvider(offlineKeyProvider);
 *
 * // Create the offline search params
 * const offlineSearchParams = new OfflineSearchParams("hello_hello.aleo/hello");
 *
 * // Create the offline transaction
 * const offlineExecuteTx = <Transaction>await this.buildExecutionTransaction("hello_hello.aleo", "hello", 1, false, ["5u32", "5u32"], undefined, offlineSearchParams, undefined, undefined, undefined, undefined, offlineQuery, program);
 *
 * // Broadcast the transaction later on a machine with internet access
 * const networkClient = new AleoNetworkClient("https://api.explorer.aleo.org/v1");
 * const txId = await networkClient.broadcastTransaction(offlineExecuteTx);
 */
class OfflineKeyProvider {
    cache;
    constructor() {
        this.cache = new Map();
    }
    /**
     * Get bond_public function keys from the credits.aleo program. The keys must be cached prior to calling this
     * method for it to work.
     *
     * @returns {Promise<FunctionKeyPair | Error>} Proving and verifying keys for the bond_public function
     */
    bondPublicKeys() {
        return this.functionKeys(OfflineSearchParams.bondPublicKeyParams());
    }
    ;
    /**
     * Cache a set of keys. This will overwrite any existing keys with the same keyId. The user can check if a keyId
     * exists in the cache using the containsKeys method prior to calling this method if overwriting is not desired.
     *
     * @param {string} keyId access key for the cache
     * @param {FunctionKeyPair} keys keys to cache
     */
    cacheKeys(keyId, keys) {
        const [provingKey, verifyingKey] = keys;
        this.cache.set(keyId, [provingKey.toBytes(), verifyingKey.toBytes()]);
    }
    ;
    /**
     * Get unbond_public function keys from the credits.aleo program. The keys must be cached prior to calling this
     * method for it to work.
     *
     * @returns {Promise<FunctionKeyPair | Error>} Proving and verifying keys for the unbond_public function
     */
    claimUnbondPublicKeys() {
        return this.functionKeys(OfflineSearchParams.claimUnbondPublicKeyParams());
    }
    ;
    /**
     * Get arbitrary function key from the offline key provider cache.
     *
     * @param {KeySearchParams | undefined} params - Optional search parameters for the key provider
     * @returns {Promise<FunctionKeyPair | Error>} Proving and verifying keys for the specified program
     *
     * @example
     * /// First cache the keys from local offline resources
     * const offlineKeyProvider = new OfflineKeyProvider();
     * const myFunctionVerifyingKey = VerifyingKey.fromString("verifier...");
     * const myFunctionProvingKeyBytes = await readBinaryFile('./resources/myfunction.prover');
     * const myFunctionProvingKey = ProvingKey.fromBytes(myFunctionProvingKeyBytes);
     *
     * /// Cache the keys for future use with a memorable locator
     * offlineKeyProvider.cacheKeys("myprogram.aleo/myfunction", [myFunctionProvingKey, myFunctionVerifyingKey]);
     *
     * /// When they're needed, retrieve the keys from the cache
     *
     * /// First create a search parameter object with the same locator used to cache the keys
     * const keyParams = new OfflineSearchParams("myprogram.aleo/myfunction");
     *
     * /// Then retrieve the keys
     * const [myFunctionProver, myFunctionVerifier] = await offlineKeyProvider.functionKeys(keyParams);
     */
    functionKeys(params) {
        return new Promise((resolve, reject) => {
            if (params === undefined) {
                reject(new Error("No search parameters provided, cannot retrieve keys"));
            }
            else {
                const keyId = params.cacheKey;
                const verifyCreditsKeys = params.verifyCreditsKeys;
                if (this.cache.has(keyId)) {
                    const [provingKeyBytes, verifyingKeyBytes] = this.cache.get(keyId);
                    const provingKey = ProvingKey.fromBytes(provingKeyBytes);
                    const verifyingKey = VerifyingKey.fromBytes(verifyingKeyBytes);
                    if (verifyCreditsKeys) {
                        const keysMatchExpected = this.verifyCreditsKeys(keyId, provingKey, verifyingKey);
                        if (!keysMatchExpected) {
                            reject(new Error(`Cached keys do not match expected keys for ${keyId}`));
                        }
                    }
                    resolve([provingKey, verifyingKey]);
                }
                else {
                    reject(new Error("Keys not found in cache for " + keyId));
                }
            }
        });
    }
    ;
    /**
     * Determines if the keys for a given credits function match the expected keys.
     *
     * @returns {boolean} Whether the keys match the expected keys
     */
    verifyCreditsKeys(locator, provingKey, verifyingKey) {
        switch (locator) {
            case CREDITS_PROGRAM_KEYS.bond_public.locator:
                return provingKey.isBondPublicProver() && verifyingKey.isBondPublicVerifier();
            case CREDITS_PROGRAM_KEYS.claim_unbond_public.locator:
                return provingKey.isClaimUnbondPublicProver() && verifyingKey.isClaimUnbondPublicVerifier();
            case CREDITS_PROGRAM_KEYS.fee_private.locator:
                return provingKey.isFeePrivateProver() && verifyingKey.isFeePrivateVerifier();
            case CREDITS_PROGRAM_KEYS.fee_public.locator:
                return provingKey.isFeePublicProver() && verifyingKey.isFeePublicVerifier();
            case CREDITS_PROGRAM_KEYS.inclusion.locator:
                return provingKey.isInclusionProver() && verifyingKey.isInclusionVerifier();
            case CREDITS_PROGRAM_KEYS.join.locator:
                return provingKey.isJoinProver() && verifyingKey.isJoinVerifier();
            case CREDITS_PROGRAM_KEYS.set_validator_state.locator:
                return provingKey.isSetValidatorStateProver() && verifyingKey.isSetValidatorStateVerifier();
            case CREDITS_PROGRAM_KEYS.split.locator:
                return provingKey.isSplitProver() && verifyingKey.isSplitVerifier();
            case CREDITS_PROGRAM_KEYS.transfer_private.locator:
                return provingKey.isTransferPrivateProver() && verifyingKey.isTransferPrivateVerifier();
            case CREDITS_PROGRAM_KEYS.transfer_private_to_public.locator:
                return provingKey.isTransferPrivateToPublicProver() && verifyingKey.isTransferPrivateToPublicVerifier();
            case CREDITS_PROGRAM_KEYS.transfer_public.locator:
                return provingKey.isTransferPublicProver() && verifyingKey.isTransferPublicVerifier();
            case CREDITS_PROGRAM_KEYS.transfer_public_to_private.locator:
                return provingKey.isTransferPublicToPrivateProver() && verifyingKey.isTransferPublicToPrivateVerifier();
            case CREDITS_PROGRAM_KEYS.unbond_delegator_as_validator.locator:
                return provingKey.isUnbondDelegatorAsValidatorProver() && verifyingKey.isUnbondDelegatorAsValidatorVerifier();
            case CREDITS_PROGRAM_KEYS.unbond_public.locator:
                return provingKey.isUnbondPublicProver() && verifyingKey.isUnbondPublicVerifier();
            default:
                return false;
        }
    }
    /**
     * Get fee_private function keys from the credits.aleo program. The keys must be cached prior to calling this
     * method for it to work.
     *
     * @returns {Promise<FunctionKeyPair | Error>} Proving and verifying keys for the join function
     */
    feePrivateKeys() {
        return this.functionKeys(OfflineSearchParams.feePrivateKeyParams());
    }
    ;
    /**
     * Get fee_public function keys from the credits.aleo program. The keys must be cached prior to calling this
     * method for it to work.
     *
     * @returns {Promise<FunctionKeyPair | Error>} Proving and verifying keys for the join function
     */
    feePublicKeys() {
        return this.functionKeys(OfflineSearchParams.feePublicKeyParams());
    }
    ;
    /**
     * Get join function keys from the credits.aleo program. The keys must be cached prior to calling this
     * method for it to work.
     *
     * @returns {Promise<FunctionKeyPair | Error>} Proving and verifying keys for the join function
     */
    joinKeys() {
        return this.functionKeys(OfflineSearchParams.joinKeyParams());
    }
    ;
    /**
     * Get split function keys from the credits.aleo program. The keys must be cached prior to calling this
     * method for it to work.
     *
     * @returns {Promise<FunctionKeyPair | Error>} Proving and verifying keys for the join function
     */
    splitKeys() {
        return this.functionKeys(OfflineSearchParams.splitKeyParams());
    }
    ;
    /**
     * Get keys for a variant of the transfer function from the credits.aleo program.
     *
     *
     * @param {string} visibility Visibility of the transfer function (private, public, privateToPublic, publicToPrivate)
     * @returns {Promise<FunctionKeyPair | Error>} Proving and verifying keys for the specified transfer function
     *
     * @example
     * // Create a new OfflineKeyProvider
     * const offlineKeyProvider = new OfflineKeyProvider();
     *
     * // Cache the keys for future use with the official locator
     * const transferPublicProvingKeyBytes = await readBinaryFile('./resources/transfer_public.prover.a74565e');
     * const transferPublicProvingKey = ProvingKey.fromBytes(transferPublicProvingKeyBytes);
     *
     * // Cache the transfer_public keys for future use with the OfflinKeyProvider's convenience method for
     * // transfer_public (the verifying key will be cached automatically)
     * offlineKeyProvider.insertTransferPublicKeys(transferPublicProvingKey);
     *
     * /// When they're needed, retrieve the keys from the cache
     * const [transferPublicProvingKey, transferPublicVerifyingKey] = await keyProvider.transferKeys("public");
     */
    transferKeys(visibility) {
        if (PRIVATE_TRANSFER.has(visibility)) {
            return this.functionKeys(OfflineSearchParams.transferPrivateKeyParams());
        }
        else if (PRIVATE_TO_PUBLIC_TRANSFER.has(visibility)) {
            return this.functionKeys(OfflineSearchParams.transferPrivateToPublicKeyParams());
        }
        else if (PUBLIC_TRANSFER.has(visibility)) {
            return this.functionKeys(OfflineSearchParams.transferPublicKeyParams());
        }
        else if (PUBLIC_TO_PRIVATE_TRANSFER.has(visibility)) {
            return this.functionKeys(OfflineSearchParams.transferPublicToPrivateKeyParams());
        }
        else {
            throw new Error("Invalid visibility type");
        }
    }
    ;
    /**
     * Get unbond_public function keys from the credits.aleo program
     *
     * @returns {Promise<FunctionKeyPair | Error>} Proving and verifying keys for the join function
     */
    async unBondPublicKeys() {
        return this.functionKeys(OfflineSearchParams.unbondPublicKeyParams());
    }
    ;
    /**
     * Insert the proving and verifying keys for the bond_public function into the cache. Only the proving key needs
     * to be inserted, the verifying key is automatically inserted by the SDK. This function will automatically check
     * that the keys match the expected checksum for bond_public before inserting them into the cache.
     *
     * @param provingKey
     */
    insertBondPublicKeys(provingKey) {
        if (provingKey.isBondPublicProver()) {
            this.cache.set(CREDITS_PROGRAM_KEYS.bond_public.locator, [provingKey.toBytes(), VerifyingKey.bondPublicVerifier().toBytes()]);
        }
        else {
            throw new Error("Attempted to insert invalid proving keys for bond_public");
        }
    }
    /**
     * Insert the proving and verifying keys for the claim_unbond_public function into the cache. Only the proving key needs
     * to be inserted, the verifying key is automatically inserted by the SDK. This function will automatically check
     * that the keys match the expected checksum for claim_unbond_public before inserting them into the cache.
     *
     * @param provingKey
     */
    insertClaimUnbondPublicKeys(provingKey) {
        if (provingKey.isClaimUnbondPublicProver()) {
            this.cache.set(CREDITS_PROGRAM_KEYS.claim_unbond_public.locator, [provingKey.toBytes(), VerifyingKey.claimUnbondPublicVerifier().toBytes()]);
        }
        else {
            throw new Error("Attempted to insert invalid proving keys for claim_unbond_public");
        }
    }
    /**
     * Insert the proving and verifying keys for the fee_private function into the cache. Only the proving key needs
     * to be inserted, the verifying key is automatically inserted by the SDK. This function will automatically check
     * that the keys match the expected checksum for fee_private before inserting them into the cache.
     *
     * @param provingKey
     */
    insertFeePrivateKeys(provingKey) {
        if (provingKey.isFeePrivateProver()) {
            this.cache.set(CREDITS_PROGRAM_KEYS.fee_private.locator, [provingKey.toBytes(), VerifyingKey.feePrivateVerifier().toBytes()]);
        }
        else {
            throw new Error("Attempted to insert invalid proving keys for fee_private");
        }
    }
    /**
     * Insert the proving and verifying keys for the fee_public function into the cache. Only the proving key needs
     * to be inserted, the verifying key is automatically inserted by the SDK. This function will automatically check
     * that the keys match the expected checksum for fee_public before inserting them into the cache.
     *
     * @param provingKey
     */
    insertFeePublicKeys(provingKey) {
        if (provingKey.isFeePublicProver()) {
            this.cache.set(CREDITS_PROGRAM_KEYS.fee_public.locator, [provingKey.toBytes(), VerifyingKey.feePublicVerifier().toBytes()]);
        }
        else {
            throw new Error("Attempted to insert invalid proving keys for fee_public");
        }
    }
    /**
     * Insert the proving and verifying keys for the join function into the cache. Only the proving key needs
     * to be inserted, the verifying key is automatically inserted by the SDK. This function will automatically check
     * that the keys match the expected checksum for join before inserting them into the cache.
     *
     * @param provingKey
     */
    insertJoinKeys(provingKey) {
        if (provingKey.isJoinProver()) {
            this.cache.set(CREDITS_PROGRAM_KEYS.join.locator, [provingKey.toBytes(), VerifyingKey.joinVerifier().toBytes()]);
        }
        else {
            throw new Error("Attempted to insert invalid proving keys for join");
        }
    }
    /**
     * Insert the proving and verifying keys for the set_validator_state function into the cache. Only the proving key needs
     * to be inserted, the verifying key is automatically inserted by the SDK. This function will automatically check
     * that the keys match the expected checksum for set_validator_state before inserting them into the cache.
     *
     * @param provingKey
     */
    insertSetValidatorStateKeys(provingKey) {
        if (provingKey.isSetValidatorStateProver()) {
            this.cache.set(CREDITS_PROGRAM_KEYS.set_validator_state.locator, [provingKey.toBytes(), VerifyingKey.setValidatorStateVerifier().toBytes()]);
        }
        else {
            throw new Error("Attempted to insert invalid proving keys for set_validator_state");
        }
    }
    /**
     * Insert the proving and verifying keys for the split function into the cache. Only the proving key needs
     * to be inserted, the verifying key is automatically inserted by the SDK. This function will automatically check
     * that the keys match the expected checksum for split before inserting them into the cache.
     *
     * @param provingKey
     */
    insertSplitKeys(provingKey) {
        if (provingKey.isSplitProver()) {
            this.cache.set(CREDITS_PROGRAM_KEYS.split.locator, [provingKey.toBytes(), VerifyingKey.splitVerifier().toBytes()]);
        }
        else {
            throw new Error("Attempted to insert invalid proving keys for split");
        }
    }
    /**
     * Insert the proving and verifying keys for the transfer_private function into the cache. Only the proving key needs
     * to be inserted, the verifying key is automatically inserted by the SDK. This function will automatically check
     * that the keys match the expected checksum for transfer_private before inserting them into the cache.
     *
     * @param provingKey
     */
    insertTransferPrivateKeys(provingKey) {
        if (provingKey.isTransferPrivateProver()) {
            this.cache.set(CREDITS_PROGRAM_KEYS.transfer_private.locator, [provingKey.toBytes(), VerifyingKey.transferPrivateVerifier().toBytes()]);
        }
        else {
            throw new Error("Attempted to insert invalid proving keys for transfer_private");
        }
    }
    /**
     * Insert the proving and verifying keys for the transfer_private_to_public function into the cache. Only the proving key needs
     * to be inserted, the verifying key is automatically inserted by the SDK. This function will automatically check
     * that the keys match the expected checksum for transfer_private_to_public before inserting them into the cache.
     *
     * @param provingKey
     */
    insertTransferPrivateToPublicKeys(provingKey) {
        if (provingKey.isTransferPrivateToPublicProver()) {
            this.cache.set(CREDITS_PROGRAM_KEYS.transfer_private_to_public.locator, [provingKey.toBytes(), VerifyingKey.transferPrivateToPublicVerifier().toBytes()]);
        }
        else {
            throw new Error("Attempted to insert invalid proving keys for transfer_private_to_public");
        }
    }
    /**
     * Insert the proving and verifying keys for the transfer_public function into the cache. Only the proving key needs
     * to be inserted, the verifying key is automatically inserted by the SDK. This function will automatically check
     * that the keys match the expected checksum for transfer_public before inserting them into the cache.
     *
     * @param provingKey
     */
    insertTransferPublicKeys(provingKey) {
        if (provingKey.isTransferPublicProver()) {
            this.cache.set(CREDITS_PROGRAM_KEYS.transfer_public.locator, [provingKey.toBytes(), VerifyingKey.transferPublicVerifier().toBytes()]);
        }
        else {
            throw new Error("Attempted to insert invalid proving keys for transfer_public");
        }
    }
    /**
     * Insert the proving and verifying keys for the transfer_public_to_private function into the cache. Only the proving key needs
     * to be inserted, the verifying key is automatically inserted by the SDK. This function will automatically check
     * that the keys match the expected checksum for transfer_public_to_private before inserting them into the cache.
     *
     * @param provingKey
     */
    insertTransferPublicToPrivateKeys(provingKey) {
        if (provingKey.isTransferPublicToPrivateProver()) {
            this.cache.set(CREDITS_PROGRAM_KEYS.transfer_public_to_private.locator, [provingKey.toBytes(), VerifyingKey.transferPublicToPrivateVerifier().toBytes()]);
        }
        else {
            throw new Error("Attempted to insert invalid proving keys for transfer_public_to_private");
        }
    }
    insertUnbondDelegatorAsValidatorKeys(provingKey) {
        if (provingKey.isUnbondDelegatorAsValidatorProver()) {
            this.cache.set(CREDITS_PROGRAM_KEYS.unbond_delegator_as_validator.locator, [provingKey.toBytes(), VerifyingKey.unbondDelegatorAsValidatorVerifier().toBytes()]);
        }
        else {
            throw new Error("Attempted to insert invalid proving keys for unbond_delegator_as_validator");
        }
    }
    insertUnbondPublicKeys(provingKey) {
        if (provingKey.isUnbondPublicProver()) {
            this.cache.set(CREDITS_PROGRAM_KEYS.unbond_public.locator, [provingKey.toBytes(), VerifyingKey.unbondPublicVerifier().toBytes()]);
        }
        else {
            throw new Error("Attempted to insert invalid proving keys for unbond_public");
        }
    }
}

/**
 * A record provider implementation that uses the official Aleo API to find records for usage in program execution and
 * deployment, wallet functionality, and other use cases.
 */
class NetworkRecordProvider {
    account;
    networkClient;
    constructor(account, networkClient) {
        this.account = account;
        this.networkClient = networkClient;
    }
    /**
     * Set the account used to search for records
     *
     * @param {Account} account The account to use for searching for records
     */
    setAccount(account) {
        this.account = account;
    }
    /**
     * Find a list of credit records with a given number of microcredits by via the official Aleo API
     *
     * @param {number[]} microcredits The number of microcredits to search for
     * @param {boolean} unspent Whether or not the record is unspent
     * @param {string[]} nonces Nonces of records already found so that they are not found again
     * @param {RecordSearchParams} searchParameters Additional parameters to search for
     * @returns {Promise<RecordPlaintext | Error>} The record if found, otherwise an error
     *
     * @example
     * // Create a new NetworkRecordProvider
     * const networkClient = new AleoNetworkClient("https://api.explorer.aleo.org/v1");
     * const keyProvider = new AleoKeyProvider();
     * const recordProvider = new NetworkRecordProvider(account, networkClient);
     *
     * // The record provider can be used to find records with a given number of microcredits
     * const record = await recordProvider.findCreditsRecord(5000, true, []);
     *
     * // When a record is found but not yet used, it's nonce should be added to the nonces parameter so that it is not
     * // found again if a subsequent search is performed
     * const records = await recordProvider.findCreditsRecords(5000, true, [record.nonce()]);
     *
     * // When the program manager is initialized with the record provider it will be used to find automatically find
     * // fee records and amount records for value transfers so that they do not need to be specified manually
     * const programManager = new ProgramManager("https://api.explorer.aleo.org/v1", keyProvider, recordProvider);
     * programManager.transfer(1, "aleo166q6ww6688cug7qxwe7nhctjpymydwzy2h7rscfmatqmfwnjvggqcad0at", "public", 0.5);
     *
     * */
    async findCreditsRecords(microcredits, unspent, nonces, searchParameters) {
        let startHeight = 0;
        let endHeight = 0;
        if (searchParameters) {
            if ("startHeight" in searchParameters && typeof searchParameters["endHeight"] == "number") {
                startHeight = searchParameters["startHeight"];
            }
            if ("endHeight" in searchParameters && typeof searchParameters["endHeight"] == "number") {
                endHeight = searchParameters["endHeight"];
            }
        }
        // If the end height is not specified, use the current block height
        if (endHeight == 0) {
            const end = await this.networkClient.getLatestHeight();
            if (end instanceof Error) {
                throw logAndThrow("Unable to get current block height from the network");
            }
            endHeight = end;
        }
        // If the start height is greater than the end height, throw an error
        if (startHeight >= endHeight) {
            throw logAndThrow("Start height must be less than end height");
        }
        return await this.networkClient.findUnspentRecords(startHeight, endHeight, this.account.privateKey(), microcredits, undefined, nonces);
    }
    /**
     * Find a credit record with a given number of microcredits by via the official Aleo API
     *
     * @param {number} microcredits The number of microcredits to search for
     * @param {boolean} unspent Whether or not the record is unspent
     * @param {string[]} nonces Nonces of records already found so that they are not found again
     * @param {RecordSearchParams} searchParameters Additional parameters to search for
     * @returns {Promise<RecordPlaintext | Error>} The record if found, otherwise an error
     *
     * @example
     * // Create a new NetworkRecordProvider
     * const networkClient = new AleoNetworkClient("https://api.explorer.aleo.org/v1");
     * const keyProvider = new AleoKeyProvider();
     * const recordProvider = new NetworkRecordProvider(account, networkClient);
     *
     * // The record provider can be used to find records with a given number of microcredits
     * const record = await recordProvider.findCreditsRecord(5000, true, []);
     *
     * // When a record is found but not yet used, it's nonce should be added to the nonces parameter so that it is not
     * // found again if a subsequent search is performed
     * const records = await recordProvider.findCreditsRecords(5000, true, [record.nonce()]);
     *
     * // When the program manager is initialized with the record provider it will be used to find automatically find
     * // fee records and amount records for value transfers so that they do not need to be specified manually
     * const programManager = new ProgramManager("https://api.explorer.aleo.org/v1", keyProvider, recordProvider);
     * programManager.transfer(1, "aleo166q6ww6688cug7qxwe7nhctjpymydwzy2h7rscfmatqmfwnjvggqcad0at", "public", 0.5);
     */
    async findCreditsRecord(microcredits, unspent, nonces, searchParameters) {
        const records = await this.findCreditsRecords([microcredits], unspent, nonces, searchParameters);
        if (!(records instanceof Error) && records.length > 0) {
            return records[0];
        }
        console.error("Record not found with error:", records);
        return new Error("Record not found");
    }
    /**
     * Find an arbitrary record. WARNING: This function is not implemented yet and will throw an error.
     */
    async findRecord(unspent, nonces, searchParameters) {
        throw new Error("Method not implemented.");
    }
    /**
     * Find multiple arbitrary records. WARNING: This function is not implemented yet and will throw an error.
     */
    async findRecords(unspent, nonces, searchParameters) {
        throw new Error("Method not implemented.");
    }
}
/**
 * BlockHeightSearch is a RecordSearchParams implementation that allows for searching for records within a given
 * block height range.
 *
 * @example
 * // Create a new BlockHeightSearch
 * const params = new BlockHeightSearch(89995, 99995);
 *
 * // Create a new NetworkRecordProvider
 * const networkClient = new AleoNetworkClient("https://api.explorer.aleo.org/v1");
 * const keyProvider = new AleoKeyProvider();
 * const recordProvider = new NetworkRecordProvider(account, networkClient);
 *
 * // The record provider can be used to find records with a given number of microcredits and the block height search
 * // can be used to find records within a given block height range
 * const record = await recordProvider.findCreditsRecord(5000, true, [], params);
 *
 */
class BlockHeightSearch {
    startHeight;
    endHeight;
    constructor(startHeight, endHeight) {
        this.startHeight = startHeight;
        this.endHeight = endHeight;
    }
}

// Experimental example where SDK manages worker
let singletonWorker = null;
const createAleoWorker = () => {
    if (!singletonWorker) {
        const worker = new Worker(new URL("worker.js", import.meta.url), {
            type: "module",
        });
        singletonWorker = wrap(worker);
    }
    return singletonWorker;
};

/**
 * The ProgramManager class is used to execute and deploy programs on the Aleo network and create value transfers.
 */
class ProgramManager {
    account;
    keyProvider;
    host;
    networkClient;
    recordProvider;
    /** Create a new instance of the ProgramManager
     *
     * @param { string | undefined } host A host uri running the official Aleo API
     * @param { FunctionKeyProvider | undefined } keyProvider A key provider that implements {@link FunctionKeyProvider} interface
     * @param { RecordProvider | undefined } recordProvider A record provider that implements {@link RecordProvider} interface
     */
    constructor(host, keyProvider, recordProvider) {
        this.host = host ? host : 'https://api.explorer.aleo.org/v1';
        this.networkClient = new AleoNetworkClient(this.host);
        this.keyProvider = keyProvider ? keyProvider : new AleoKeyProvider();
        this.recordProvider = recordProvider;
    }
    /**
     * Set the account to use for transaction submission to the Aleo network
     *
     * @param {Account} account Account to use for transaction submission
     */
    setAccount(account) {
        this.account = account;
    }
    /**
     * Set the key provider that provides the proving and verifying keys for programs
     *
     * @param {FunctionKeyProvider} keyProvider
     */
    setKeyProvider(keyProvider) {
        this.keyProvider = keyProvider;
    }
    /**
     * Set the host peer to use for transaction submission to the Aleo network
     *
     * @param host {string} Peer url to use for transaction submission
     */
    setHost(host) {
        this.host = host;
        this.networkClient.setHost(host);
    }
    /**
     * Set the record provider that provides records for transactions
     *
     * @param {RecordProvider} recordProvider
     */
    setRecordProvider(recordProvider) {
        this.recordProvider = recordProvider;
    }
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
    async deploy(program, fee, privateFee, recordSearchParams, feeRecord, privateKey) {
        // Ensure the program is valid and does not exist on the network
        try {
            const programObject = Program.fromString(program);
            let programSource;
            try {
                programSource = await this.networkClient.getProgram(programObject.id());
            }
            catch (e) {
                // Program does not exist on the network, deployment can proceed
                console.log(`Program ${programObject.id()} does not exist on the network, deploying...`);
            }
            if (typeof programSource == "string") {
                throw (`Program ${programObject.id()} already exists on the network, please rename your program`);
            }
        }
        catch (e) {
            throw logAndThrow(`Error validating program: ${e}`);
        }
        // Get the private key from the account if it is not provided in the parameters
        let deploymentPrivateKey = privateKey;
        if (typeof privateKey === "undefined" && typeof this.account !== "undefined") {
            deploymentPrivateKey = this.account.privateKey();
        }
        if (typeof deploymentPrivateKey === "undefined") {
            throw ("No private key provided and no private key set in the ProgramManager");
        }
        // Get the fee record from the account if it is not provided in the parameters
        try {
            feeRecord = privateFee ? await this.getCreditsRecord(fee, [], feeRecord, recordSearchParams) : undefined;
        }
        catch (e) {
            throw logAndThrow(`Error finding fee record. Record finder response: '${e}'. Please ensure you're connected to a valid Aleo network and a record with enough balance exists.`);
        }
        // Get the proving and verifying keys from the key provider
        let feeKeys;
        try {
            feeKeys = privateFee ? await this.keyProvider.feePrivateKeys() : await this.keyProvider.feePublicKeys();
        }
        catch (e) {
            throw logAndThrow(`Error finding fee keys. Key finder response: '${e}'. Please ensure your key provider is configured correctly.`);
        }
        const [feeProvingKey, feeVerifyingKey] = feeKeys;
        // Resolve the program imports if they exist
        let imports;
        try {
            imports = await this.networkClient.getProgramImports(program);
        }
        catch (e) {
            throw logAndThrow(`Error finding program imports. Network response: '${e}'. Please ensure you're connected to a valid Aleo network and the program is deployed to the network.`);
        }
        // Build a deployment transaction and submit it to the network
        const tx = await ProgramManager$1.buildDeploymentTransaction(deploymentPrivateKey, program, fee, feeRecord, this.host, imports, feeProvingKey, feeVerifyingKey);
        return await this.networkClient.submitTransaction(tx);
    }
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
    async buildExecutionTransaction(options) {
        // Destructure the options object to access the parameters
        const { programName, functionName, fee, privateFee, inputs, recordSearchParams, keySearchParams, privateKey, offlineQuery } = options;
        let feeRecord = options.feeRecord;
        let provingKey = options.provingKey;
        let verifyingKey = options.verifyingKey;
        let program = options.program;
        let imports = options.imports;
        // Ensure the function exists on the network
        if (program === undefined) {
            try {
                program = (await this.networkClient.getProgram(programName));
            }
            catch (e) {
                throw logAndThrow(`Error finding ${programName}. Network response: '${e}'. Please ensure you're connected to a valid Aleo network the program is deployed to the network.`);
            }
        }
        else if (program instanceof Program) {
            program = program.toString();
        }
        // Get the private key from the account if it is not provided in the parameters
        let executionPrivateKey = privateKey;
        if (typeof privateKey === "undefined" && typeof this.account !== "undefined") {
            executionPrivateKey = this.account.privateKey();
        }
        if (typeof executionPrivateKey === "undefined") {
            throw ("No private key provided and no private key set in the ProgramManager");
        }
        // Get the fee record from the account if it is not provided in the parameters
        try {
            feeRecord = privateFee ? await this.getCreditsRecord(fee, [], feeRecord, recordSearchParams) : undefined;
        }
        catch (e) {
            throw logAndThrow(`Error finding fee record. Record finder response: '${e}'. Please ensure you're connected to a valid Aleo network and a record with enough balance exists.`);
        }
        // Get the fee proving and verifying keys from the key provider
        let feeKeys;
        try {
            feeKeys = privateFee ? await this.keyProvider.feePrivateKeys() : await this.keyProvider.feePublicKeys();
        }
        catch (e) {
            throw logAndThrow(`Error finding fee keys. Key finder response: '${e}'. Please ensure your key provider is configured correctly.`);
        }
        const [feeProvingKey, feeVerifyingKey] = feeKeys;
        // If the function proving and verifying keys are not provided, attempt to find them using the key provider
        if (!provingKey || !verifyingKey) {
            try {
                [provingKey, verifyingKey] = await this.keyProvider.functionKeys(keySearchParams);
            }
            catch (e) {
                console.log(`Function keys not found. Key finder response: '${e}'. The function keys will be synthesized`);
            }
        }
        // Resolve the program imports if they exist
        const numberOfImports = Program.fromString(program).getImports().length;
        if (numberOfImports > 0 && !imports) {
            try {
                imports = await this.networkClient.getProgramImports(programName);
            }
            catch (e) {
                throw logAndThrow(`Error finding program imports. Network response: '${e}'. Please ensure you're connected to a valid Aleo network and the program is deployed to the network.`);
            }
        }
        // Build an execution transaction and submit it to the network
        return await ProgramManager$1.buildExecutionTransaction(executionPrivateKey, program, functionName, inputs, fee, feeRecord, this.host, imports, provingKey, verifyingKey, feeProvingKey, feeVerifyingKey, offlineQuery);
    }
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
    async execute(options) {
        const tx = await this.buildExecutionTransaction(options);
        return await this.networkClient.submitTransaction(tx);
    }
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
    async run(program, function_name, inputs, proveExecution, imports, keySearchParams, provingKey, verifyingKey, privateKey, offlineQuery) {
        // Get the private key from the account if it is not provided in the parameters
        let executionPrivateKey = privateKey;
        if (typeof privateKey === "undefined" && typeof this.account !== "undefined") {
            executionPrivateKey = this.account.privateKey();
        }
        if (typeof executionPrivateKey === "undefined") {
            throw ("No private key provided and no private key set in the ProgramManager");
        }
        // If the function proving and verifying keys are not provided, attempt to find them using the key provider
        if (!provingKey || !verifyingKey) {
            try {
                [provingKey, verifyingKey] = await this.keyProvider.functionKeys(keySearchParams);
            }
            catch (e) {
                console.log(`Function keys not found. Key finder response: '${e}'. The function keys will be synthesized`);
            }
        }
        // Run the program offline and return the result
        console.log("Running program offline");
        console.log("Proving key: ", provingKey);
        console.log("Verifying key: ", verifyingKey);
        return ProgramManager$1.executeFunctionOffline(executionPrivateKey, program, function_name, inputs, proveExecution, false, imports, provingKey, verifyingKey, this.host, offlineQuery);
    }
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
    async join(recordOne, recordTwo, fee, privateFee, recordSearchParams, feeRecord, privateKey, offlineQuery) {
        // Get the private key from the account if it is not provided in the parameters
        let executionPrivateKey = privateKey;
        if (typeof privateKey === "undefined" && typeof this.account !== "undefined") {
            executionPrivateKey = this.account.privateKey();
        }
        if (typeof executionPrivateKey === "undefined") {
            throw ("No private key provided and no private key set in the ProgramManager");
        }
        // Get the proving and verifying keys from the key provider
        let feeKeys;
        let joinKeys;
        try {
            feeKeys = privateFee ? await this.keyProvider.feePrivateKeys() : await this.keyProvider.feePublicKeys();
            joinKeys = await this.keyProvider.joinKeys();
        }
        catch (e) {
            throw logAndThrow(`Error finding fee keys. Key finder response: '${e}'. Please ensure your key provider is configured correctly.`);
        }
        const [feeProvingKey, feeVerifyingKey] = feeKeys;
        const [joinProvingKey, joinVerifyingKey] = joinKeys;
        // Get the fee record from the account if it is not provided in the parameters
        try {
            feeRecord = privateFee ? await this.getCreditsRecord(fee, [], feeRecord, recordSearchParams) : undefined;
        }
        catch (e) {
            throw logAndThrow(`Error finding fee record. Record finder response: '${e}'. Please ensure you're connected to a valid Aleo network and a record with enough balance exists.`);
        }
        // Validate the records provided are valid plaintext records
        try {
            recordOne = recordOne instanceof RecordPlaintext ? recordOne : RecordPlaintext.fromString(recordOne);
            recordTwo = recordTwo instanceof RecordPlaintext ? recordTwo : RecordPlaintext.fromString(recordTwo);
        }
        catch (e) {
            throw logAndThrow('Records provided are not valid. Please ensure they are valid plaintext records.');
        }
        // Build an execution transaction and submit it to the network
        const tx = await ProgramManager$1.buildJoinTransaction(executionPrivateKey, recordOne, recordTwo, fee, feeRecord, this.host, joinProvingKey, joinVerifyingKey, feeProvingKey, feeVerifyingKey, offlineQuery);
        return await this.networkClient.submitTransaction(tx);
    }
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
    async split(splitAmount, amountRecord, privateKey, offlineQuery) {
        // Get the private key from the account if it is not provided in the parameters
        let executionPrivateKey = privateKey;
        if (typeof executionPrivateKey === "undefined" && typeof this.account !== "undefined") {
            executionPrivateKey = this.account.privateKey();
        }
        if (typeof executionPrivateKey === "undefined") {
            throw ("No private key provided and no private key set in the ProgramManager");
        }
        // Get the split keys from the key provider
        let splitKeys;
        try {
            splitKeys = await this.keyProvider.splitKeys();
        }
        catch (e) {
            throw logAndThrow(`Error finding fee keys. Key finder response: '${e}'. Please ensure your key provider is configured correctly.`);
        }
        const [splitProvingKey, splitVerifyingKey] = splitKeys;
        // Validate the record to be split
        try {
            amountRecord = amountRecord instanceof RecordPlaintext ? amountRecord : RecordPlaintext.fromString(amountRecord);
        }
        catch (e) {
            throw logAndThrow("Record provided is not valid. Please ensure it is a valid plaintext record.");
        }
        // Build an execution transaction and submit it to the network
        const tx = await ProgramManager$1.buildSplitTransaction(executionPrivateKey, splitAmount, amountRecord, this.host, splitProvingKey, splitVerifyingKey, offlineQuery);
        return await this.networkClient.submitTransaction(tx);
    }
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
    async synthesizeKeys(program, function_id, inputs, privateKey) {
        // Resolve the program imports if they exist
        let imports;
        let executionPrivateKey = privateKey;
        if (typeof executionPrivateKey === "undefined") {
            if (typeof this.account !== "undefined") {
                executionPrivateKey = this.account.privateKey();
            }
            else {
                executionPrivateKey = new PrivateKey();
            }
        }
        // Attempt to run an offline execution of the program and extract the proving and verifying keys
        try {
            imports = await this.networkClient.getProgramImports(program);
            const keyPair = await ProgramManager$1.synthesizeKeyPair(executionPrivateKey, program, function_id, inputs, imports);
            return [keyPair.provingKey(), keyPair.verifyingKey()];
        }
        catch (e) {
            throw logAndThrow(`Could not synthesize keys - error ${e}. Please ensure the program is valid and the inputs are correct.`);
        }
    }
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
    async buildTransferTransaction(amount, recipient, transferType, fee, privateFee, recordSearchParams, amountRecord, feeRecord, privateKey, offlineQuery) {
        // Validate the transfer type
        transferType = validateTransferType(transferType);
        // Get the private key from the account if it is not provided in the parameters
        let executionPrivateKey = privateKey;
        if (typeof executionPrivateKey === "undefined" && typeof this.account !== "undefined") {
            executionPrivateKey = this.account.privateKey();
        }
        if (typeof executionPrivateKey === "undefined") {
            throw ("No private key provided and no private key set in the ProgramManager");
        }
        // Get the proving and verifying keys from the key provider
        let feeKeys;
        let transferKeys;
        try {
            feeKeys = privateFee ? await this.keyProvider.feePrivateKeys() : await this.keyProvider.feePublicKeys();
            transferKeys = await this.keyProvider.transferKeys(transferType);
        }
        catch (e) {
            throw logAndThrow(`Error finding fee keys. Key finder response: '${e}'. Please ensure your key provider is configured correctly.`);
        }
        const [feeProvingKey, feeVerifyingKey] = feeKeys;
        const [transferProvingKey, transferVerifyingKey] = transferKeys;
        // Get the amount and fee record from the account if it is not provided in the parameters
        try {
            // Track the nonces of the records found so no duplicate records are used
            const nonces = [];
            if (requiresAmountRecord(transferType)) {
                // If the transfer type is private and requires an amount record, get it from the record provider
                amountRecord = await this.getCreditsRecord(fee, [], amountRecord, recordSearchParams);
                nonces.push(amountRecord.nonce());
            }
            else {
                amountRecord = undefined;
            }
            feeRecord = privateFee ? await this.getCreditsRecord(fee, nonces, feeRecord, recordSearchParams) : undefined;
        }
        catch (e) {
            throw logAndThrow(`Error finding fee record. Record finder response: '${e}'. Please ensure you're connected to a valid Aleo network and a record with enough balance exists.`);
        }
        // Build an execution transaction and submit it to the network
        return await ProgramManager$1.buildTransferTransaction(executionPrivateKey, amount, recipient, transferType, amountRecord, fee, feeRecord, this.host, transferProvingKey, transferVerifyingKey, feeProvingKey, feeVerifyingKey, offlineQuery);
    }
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
    async buildTransferPublicTransaction(amount, recipient, fee, privateKey, offlineQuery) {
        return this.buildTransferTransaction(amount, recipient, "public", fee, false, undefined, undefined, undefined, privateKey, offlineQuery);
    }
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
    async transfer(amount, recipient, transferType, fee, privateFee, recordSearchParams, amountRecord, feeRecord, privateKey, offlineQuery) {
        const tx = await this.buildTransferTransaction(amount, recipient, transferType, fee, privateFee, recordSearchParams, amountRecord, feeRecord, privateKey, offlineQuery);
        return await this.networkClient.submitTransaction(tx);
    }
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
    async buildBondPublicTransaction(address, amount, options = {}) {
        const scaledAmount = Math.trunc(amount * 1000000);
        const { programName = "credits.aleo", functionName = "bond_public", fee = options.fee || 0.86, privateFee = false, inputs = [address, `${scaledAmount.toString()}u64`], keySearchParams = new AleoKeyProviderParams({
            proverUri: CREDITS_PROGRAM_KEYS.bond_public.prover,
            verifierUri: CREDITS_PROGRAM_KEYS.bond_public.verifier,
            cacheKey: "credits.aleo/bond_public"
        }), program = this.creditsProgram(), ...additionalOptions } = options;
        const executeOptions = {
            programName,
            functionName,
            fee,
            privateFee,
            inputs,
            keySearchParams,
            ...additionalOptions
        };
        return await this.buildExecutionTransaction(executeOptions);
    }
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
    async bondPublic(address, amount, options = {}) {
        const tx = await this.buildBondPublicTransaction(address, amount, options);
        return await this.networkClient.submitTransaction(tx);
    }
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
    async buildUnbondPublicTransaction(amount, options = {}) {
        const scaledAmount = Math.trunc(amount * 1000000);
        const { programName = "credits.aleo", functionName = "unbond_public", fee = options.fee || 1.3, privateFee = false, inputs = [`${scaledAmount.toString()}u64`], keySearchParams = new AleoKeyProviderParams({
            proverUri: CREDITS_PROGRAM_KEYS.unbond_public.prover,
            verifierUri: CREDITS_PROGRAM_KEYS.unbond_public.verifier,
            cacheKey: "credits.aleo/unbond_public"
        }), program = this.creditsProgram(), ...additionalOptions } = options;
        const executeOptions = {
            programName,
            functionName,
            fee,
            privateFee,
            inputs,
            keySearchParams,
            ...additionalOptions
        };
        return this.buildExecutionTransaction(executeOptions);
    }
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
    async unbondPublic(amount, options = {}) {
        const tx = await this.buildUnbondPublicTransaction(amount, options);
        return await this.networkClient.submitTransaction(tx);
    }
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
    async buildClaimUnbondPublicTransaction(options = {}) {
        const { programName = "credits.aleo", functionName = "claim_unbond_public", fee = options.fee || 2, privateFee = false, inputs = [], keySearchParams = new AleoKeyProviderParams({
            proverUri: CREDITS_PROGRAM_KEYS.claim_unbond_public.prover,
            verifierUri: CREDITS_PROGRAM_KEYS.claim_unbond_public.verifier,
            cacheKey: "credits.aleo/claim_unbond_public"
        }), program = this.creditsProgram(), ...additionalOptions } = options;
        const executeOptions = {
            programName,
            functionName,
            fee,
            privateFee,
            inputs,
            keySearchParams,
            ...additionalOptions
        };
        return await this.buildExecutionTransaction(executeOptions);
    }
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
    async claimUnbondPublic(options = {}) {
        const tx = await this.buildClaimUnbondPublicTransaction(options);
        return await this.networkClient.submitTransaction(tx);
    }
    /**
     * Set Validator State
     * @returns string
     * @param {boolean} validator_state
     * @param {Partial<ExecuteOptions>} options - Override default execution options
     */
    async setValidatorState(validator_state, options = {}) {
        const { programName = "credits.aleo", functionName = "set_validator_state", fee = 1, privateFee = false, inputs = [validator_state.toString()], keySearchParams = new AleoKeyProviderParams({
            proverUri: CREDITS_PROGRAM_KEYS.set_validator_state.prover,
            verifierUri: CREDITS_PROGRAM_KEYS.set_validator_state.verifier,
            cacheKey: "credits.aleo/set_validator_state"
        }), ...additionalOptions } = options;
        const executeOptions = {
            programName,
            functionName,
            fee,
            privateFee,
            inputs,
            keySearchParams,
            ...additionalOptions
        };
        return await this.execute(executeOptions);
    }
    /**
     * Unbond Delegator As Validator
     * @returns {Promise<string | Error>} A promise that resolves to the transaction ID or an error message.
     * @param {string} address - The address of the delegator.
     * @param {Partial<ExecuteOptions>} options - Override default execution options.
     */
    async unbondDelegatorAsValidator(address, options = {}) {
        const { programName = "credits.aleo", functionName = "unbond_delegator_as_validator", fee = 1, privateFee = false, inputs = [address], keySearchParams = new AleoKeyProviderParams({
            proverUri: CREDITS_PROGRAM_KEYS.unbond_delegator_as_validator.prover,
            verifierUri: CREDITS_PROGRAM_KEYS.unbond_delegator_as_validator.verifier,
            cacheKey: "credits.aleo/unbond_delegator_as_validator"
        }), ...additionalOptions } = options;
        const executeOptions = {
            programName,
            functionName,
            fee,
            privateFee,
            inputs,
            keySearchParams,
            ...additionalOptions
        };
        return await this.execute(executeOptions);
    }
    /**
     * Verify a proof of execution from an offline execution
     *
     * @param {executionResponse} executionResponse
     * @returns {boolean} True if the proof is valid, false otherwise
     */
    verifyExecution(executionResponse) {
        try {
            const execution = executionResponse.getExecution();
            const function_id = executionResponse.getFunctionId();
            const program = executionResponse.getProgram();
            const verifyingKey = executionResponse.getVerifyingKey();
            return verifyFunctionExecution(execution, verifyingKey, program, function_id);
        }
        catch (e) {
            console.warn("The execution was not found in the response, cannot verify the execution");
            return false;
        }
    }
    /**
     * Create a program object from a program's source code
     *
     * @param {string} program Program source code
     * @returns {Program | Error} The program object
     */
    createProgramFromSource(program) {
        return Program.fromString(program);
    }
    /**
     * Get the credits program object
     *
     * @returns {Program} The credits program object
     */
    creditsProgram() {
        return Program.getCreditsProgram();
    }
    /**
     * Verify a program is valid
     *
     * @param {string} program The program source code
     */
    verifyProgram(program) {
        try {
            Program.fromString(program);
            return true;
        }
        catch (e) {
            return false;
        }
    }
    // Internal utility function for getting a credits.aleo record
    async getCreditsRecord(amount, nonces, record, params) {
        try {
            return record instanceof RecordPlaintext ? record : RecordPlaintext.fromString(record);
        }
        catch (e) {
            try {
                const recordProvider = this.recordProvider;
                return (await recordProvider.findCreditsRecord(amount, true, nonces, params));
            }
            catch (e) {
                throw logAndThrow(`Error finding fee record. Record finder response: '${e}'. Please ensure you're connected to a valid Aleo network and a record with enough balance exists.`);
            }
        }
    }
}
// Ensure the transfer type requires an amount record
function requiresAmountRecord(transferType) {
    return PRIVATE_TRANSFER_TYPES.has(transferType);
}
// Validate the transfer type
function validateTransferType(transferType) {
    return VALID_TRANSFER_TYPES.has(transferType) ? transferType :
        logAndThrow(`Invalid transfer type '${transferType}'. Valid transfer types are 'private', 'privateToPublic', 'public', and 'publicToPrivate'.`);
}

const KEY_STORE = "https://testnet3.parameters.aleo.org/";
const CREDITS_PROGRAM_KEYS = {
    bond_public: {
        locator: "credits.aleo/bond_public",
        prover: KEY_STORE + "bond_public.prover.9c3547d",
        verifier: "bond_public.verifier.10315ae",
        verifyingKey: VerifyingKey.bondPublicVerifier
    },
    claim_unbond_public: {
        locator: "credits.aleo/claim_unbond_public",
        prover: KEY_STORE + "claim_unbond_public.prover.f8b64aa",
        verifier: "claim_unbond_public.verifier.8fd7445",
        verifyingKey: VerifyingKey.claimUnbondPublicVerifier
    },
    fee_private: {
        locator: "credits.aleo/fee_private",
        prover: KEY_STORE + "fee_private.prover.43fab98",
        verifier: "fee_private.verifier.f3dfefc",
        verifyingKey: VerifyingKey.feePrivateVerifier
    },
    fee_public: {
        locator: "credits.aleo/fee_public",
        prover: KEY_STORE + "fee_public.prover.634f153",
        verifier: "fee_public.verifier.09eeb4f",
        verifyingKey: VerifyingKey.feePublicVerifier
    },
    inclusion: {
        locator: "inclusion",
        prover: KEY_STORE + "inclusion.prover.cd85cc5",
        verifier: "inclusion.verifier.e6f3add",
        verifyingKey: VerifyingKey.inclusionVerifier
    },
    join: {
        locator: "credits.aleo/join",
        prover: KEY_STORE + "join.prover.1a76fe8",
        verifier: "join.verifier.4f1701b",
        verifyingKey: VerifyingKey.joinVerifier
    },
    set_validator_state: {
        locator: "credits.aleo/set_validator_state",
        prover: KEY_STORE + "set_validator_state.prover.5ce19be",
        verifier: "set_validator_state.verifier.730d95b",
        verifyingKey: VerifyingKey.setValidatorStateVerifier
    },
    split: {
        locator: "credits.aleo/split",
        prover: KEY_STORE + "split.prover.e6d12b9",
        verifier: "split.verifier.2f9733d",
        verifyingKey: VerifyingKey.splitVerifier
    },
    transfer_private: {
        locator: "credits.aleo/transfer_private",
        prover: KEY_STORE + "transfer_private.prover.2b487c0",
        verifier: "transfer_private.verifier.3a3cbba",
        verifyingKey: VerifyingKey.transferPrivateVerifier
    },
    transfer_private_to_public: {
        locator: "credits.aleo/transfer_private_to_public",
        prover: KEY_STORE + "transfer_private_to_public.prover.1ff64cb",
        verifier: "transfer_private_to_public.verifier.d5b60de",
        verifyingKey: VerifyingKey.transferPrivateToPublicVerifier
    },
    transfer_public: {
        locator: "credits.aleo/transfer_public",
        prover: KEY_STORE + "transfer_public.prover.a74565e",
        verifier: "transfer_public.verifier.a4c2906",
        verifyingKey: VerifyingKey.transferPublicVerifier
    },
    transfer_public_to_private: {
        locator: "credits.aleo/transfer_public_to_private",
        prover: KEY_STORE + "transfer_public_to_private.prover.1bcddf9",
        verifier: "transfer_public_to_private.verifier.b094554",
        verifyingKey: VerifyingKey.transferPublicToPrivateVerifier
    },
    unbond_delegator_as_validator: {
        locator: "credits.aleo/unbond_delegator_as_validator",
        prover: KEY_STORE + "unbond_delegator_as_validator.prover.115a86b",
        verifier: "unbond_delegator_as_validator.verifier.9585609",
        verifyingKey: VerifyingKey.unbondDelegatorAsValidatorVerifier
    },
    unbond_public: {
        locator: "credits.aleo/unbond_public",
        prover: KEY_STORE + "unbond_public.prover.9547c05",
        verifier: "unbond_public.verifier.09873cd",
        verifyingKey: VerifyingKey.unbondPublicVerifier
    },
};
const PRIVATE_TRANSFER_TYPES = new Set([
    "transfer_private",
    "private",
    "transferPrivate",
    "transfer_private_to_public",
    "privateToPublic",
    "transferPrivateToPublic",
]);
const VALID_TRANSFER_TYPES = new Set([
    "transfer_private",
    "private",
    "transferPrivate",
    "transfer_private_to_public",
    "privateToPublic",
    "transferPrivateToPublic",
    "transfer_public",
    "public",
    "transferPublic",
    "transfer_public_to_private",
    "publicToPrivate",
    "transferPublicToPrivate",
]);
const PRIVATE_TRANSFER = new Set([
    "private",
    "transfer_private",
    "transferPrivate",
]);
const PRIVATE_TO_PUBLIC_TRANSFER = new Set([
    "private_to_public",
    "privateToPublic",
    "transfer_private_to_public",
    "transferPrivateToPublic",
]);
const PUBLIC_TRANSFER = new Set([
    "public",
    "transfer_public",
    "transferPublic",
]);
const PUBLIC_TO_PRIVATE_TRANSFER = new Set([
    "public_to_private",
    "publicToPrivate",
    "transfer_public_to_private",
    "transferPublicToPrivate",
]);
function logAndThrow(message) {
    console.error(message);
    throw message;
}
// @TODO: This function is no longer needed, remove it.
async function initializeWasm() {
    console.warn("initializeWasm is deprecated, you no longer need to use it");
}

export { Account, AleoKeyProvider, AleoKeyProviderParams, AleoNetworkClient, BlockHeightSearch, CREDITS_PROGRAM_KEYS, KEY_STORE, NetworkRecordProvider, OfflineKeyProvider, OfflineSearchParams, PRIVATE_TO_PUBLIC_TRANSFER, PRIVATE_TRANSFER, PRIVATE_TRANSFER_TYPES, PUBLIC_TO_PRIVATE_TRANSFER, PUBLIC_TRANSFER, ProgramManager, VALID_TRANSFER_TYPES, createAleoWorker, initializeWasm, logAndThrow };
//# sourceMappingURL=index.js.map
