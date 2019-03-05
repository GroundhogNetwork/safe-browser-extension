import EthUtil from 'ethereumjs-util'
import BigNumber from 'bignumber.js'
import 'babel-polyfill'
import fetch from 'node-fetch'
import { getPushNotificationServiceUrl } from '../../config'
import { getOwners } from 'logic/contracts/safeContracts'

export const sendSignMessage = async (
  accountAddress,
  privateKey,
  message,
  messageHash,
  safeAddress
) => {
  const hash = EthUtil.toBuffer(messageHash)
  const vrs = EthUtil.ecsign(hash, privateKey)
  const r = new BigNumber(EthUtil.bufferToHex(vrs.r))
  const s = new BigNumber(EthUtil.bufferToHex(vrs.s))
  const data = JSON.stringify({
    type: 'signTypedData',
    payload: message,
    safe: safeAddress,
    r: r.toString(10),
    s: s.toString(10),
    v: vrs.v.toString(10)
  })

  return sendNotification(data, privateKey, accountAddress, safeAddress)
}

export const sendTransaction = async (
  accountAddress,
  privateKey,
  tx,
  safeAddress
) => {
  const hash = EthUtil.toBuffer(tx.hash)
  const vrsTx = EthUtil.ecsign(hash, privateKey)
  const r = new BigNumber(EthUtil.bufferToHex(vrsTx.r))
  const s = new BigNumber(EthUtil.bufferToHex(vrsTx.s))
  const data = JSON.stringify({
    type: 'sendTransaction',
    hash: tx.hash,
    safe: tx.safe,
    to: tx.to,
    value: (tx.value) ? new BigNumber(tx.value).toString(10) : undefined,
    data: tx.data,
    operation: tx.operation,
    txGas: tx.txGas,
    dataGas: tx.dataGas,
    operationalGas: tx.operationalGas,
    gasPrice: tx.gasPrice,
    gasToken: tx.gasToken,
    nonce: tx.nonce,
    r: r.toString(10),
    s: s.toString(10),
    v: vrsTx.v.toString(10)
  })

  return sendNotification(data, privateKey, accountAddress, safeAddress)
}

export const requestConfirmationResponse = (
  type,
  accountAddress,
  privateKey,
  hash,
  safeAddress,
  prefix
) => {
  const txHash = (prefix)
    ? EthUtil.sha3(prefix + hash + type)
    : EthUtil.toBuffer(hash)

  const vrsTxHash = EthUtil.ecsign(txHash, privateKey)
  const r = new BigNumber(EthUtil.bufferToHex(vrsTxHash.r))
  const s = new BigNumber(EthUtil.bufferToHex(vrsTxHash.s))
  const data = JSON.stringify({
    type: type,
    hash: hash,
    r: r.toString(10),
    s: s.toString(10),
    v: vrsTxHash.v.toString(10)
  })

  return sendNotification(data, privateKey, accountAddress, safeAddress)
}

export const sendNotification = async (
  data,
  privateKey,
  accountAddress,
  safeAddress
) => {
  let owners
  try {
    owners = await getOwners(safeAddress, accountAddress)
  } catch (err) {
    console.error(err)
    return
  }

  const signedData = EthUtil.sha3('GNO' + data)
  const vrs = EthUtil.ecsign(signedData, privateKey)

  const url = getPushNotificationServiceUrl() + 'notifications/'
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
  const r = new BigNumber(EthUtil.bufferToHex(vrs.r))
  const s = new BigNumber(EthUtil.bufferToHex(vrs.s))
  const body = JSON.stringify({
    devices: owners,
    message: data,
    signature: {
      r: r.toString(10),
      s: s.toString(10),
      v: vrs.v
    }
  })

  return fetch(url, {
    method: 'POST',
    headers,
    body,
    credentials: 'omit',
    referrerPolicy: 'no-referrer'
  })
}
