import {
  openWalletFull,
  MoneroWalletFull,
  MoneroWalletListener,
  MoneroRpcConnection,
  OutputReceivedListener,
  SyncProgressListener,
} from 'monero-javascript'

import { db } from './db'

// --- ABSTRACT LISTENERS
const createSyncProgressListener = (onSyncProgress: SyncProgressListener) =>
  new (class extends MoneroWalletListener {
    onSyncProgress(
      height: number,
      startHeight: number,
      endHeight: number,
      percentDone: number,
      message: string
    ) {
      onSyncProgress(height, startHeight, endHeight, percentDone, message)
    }
  })() as MoneroWalletListener

const createOutputReceivedListener = (
  onOutputReceived: OutputReceivedListener
) =>
  new (class extends MoneroWalletListener {
    onOutputReceived(output: any) {
      onOutputReceived(output)
    }
  })() as MoneroWalletListener

// --- WALLET SINGLETON
class Wallet {
  private static instance: any

  private constructor() {
    /* setup the wallet with listeners for output & progress */
    return Wallet.init()
  }

  static async init() {
    const daemonConnection = Wallet.getDaemonConnection()

    let wallet
    wallet = await openWalletFull(daemonConnection).catch((err) => {
      console.log('Opening wallet failed')
      console.error(err)
    })

    Wallet.instance = wallet // store wallet in singleton
    console.info('Wallet opened successfully')

    const syncProgressListener = createSyncProgressListener(
      /* handles the new sync progress notification */
      async (
        height: number,
        startHeight: number,
        endHeight: number,
        percentDone: number,
        message: string
      ) => {
        const percentage = Math.floor(percentDone * 100)
        if (percentage === 100) {
          console.info('Wallet is synced 100%. Current Height: ', height)
        }
      }
    )

    const outputReceivedListener = createOutputReceivedListener(
      /* handles the receiving of new outputs, stores unique outputs to Transactions */
      async (output) => {
        const { amount, subaddressIndex, tx } = output.state
        // const subaddressIndex = output.getSubaddressIndex()
        // const amount = output.getAmount()

        const moneroSubaddress = await wallet.getAddress(0, subaddressIndex)
        const xmrAmountAsFloat = Wallet.convertBigIntToXmrFloat(amount)

        const existingTx = await db.transaction.findFirst({
          where: { transactionKey: tx.state.hash },
        })

        // output already seen
        if (existingTx) return

        try {
          // update the database
          await db.transaction.create({
            data: {
              moneroSubaddress,
              transactionKey: tx.state.hash,
              amount: xmrAmountAsFloat,
            },
          })
        } catch (err) {
          console.error(err)
        }
      }
    )

    // --- add the listeners
    wallet.addListener(outputReceivedListener)
    await wallet.addListener(syncProgressListener)
    console.info('Listeners added. Starting wallet sync')

    await wallet.startSyncing()

    return wallet
  }

  static async getInstance(): Promise<MoneroWalletFull> {
    /* Opens wallet or returns opened wallet */
    if (!Wallet.instance) {
      Wallet.instance = await Wallet.init()
    }
    return Wallet.instance
  }

  static getDaemonConnection() {
    /* Creates DaemonConnection to Monero Node */
    const server = new MoneroRpcConnection({
      uri: process.env.MONERO_DAEMON_URL,
      rejectUnauthorized: false,
    })

    return {
      networkType: 'mainnet',
      server,
      path: process.env.MONERO_WALLET_PATH,
      password: process.env.MONERO_WALLET_PASSWORD,
    }
  }

  static convertBigIntToXmrFloat(amount: bigint) {
    return parseFloat((Number(amount) / 1000000000000).toFixed(12))
  }

  static async createNewAddress(index: number) {
    const wallet = await Wallet.getInstance()
    return wallet.getSubaddress(0, index)
  }
}

// --- Helper function

/**
 * @param {FastifyInstance} fastify
 * @param {Object} options
 */
module.exports = async function xmrWallet(fastify, options, done) {
  const wallet = await Wallet.getInstance()
  console.log('connected to daemon: ', await wallet.isConnectedToDaemon())

  // const result = await wallet.getAddressIndex(
  //   '8BXoXwW5pfpJ25hDCVChGbVPz6WJAQDwBYNbwHFVNb92B73BuQxuGawe5bUBAJdtBEAFAdvZGpw3tDvXb9hZ2gK55q8C1cY'
  // )

  // console.log(result)
  done()
}
