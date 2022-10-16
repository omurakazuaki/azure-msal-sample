const express = require('express');
const createError = require('http-errors');
const router = express.Router();
const msal = require('../msal');
const { wrap, kv } = require('../utils');
const { BlobServiceClient } = require('@azure/storage-blob');

const errorHandler = (err, req, res, next) => {
  console.error(err);
  next(createError(err.statusCode));
};

const createBlobServiceClient = (homeAccountId) => {
  return new BlobServiceClient(
    `https://${process.env.STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
    { getToken: async() => {
      const token = await msal.acquireToken({ homeAccountId });
      return {
        token: token.accessToken,
        expiresOnTimestamp: token.idTokenClaims.exp * 1000
      }
    }}
  );
}

const getBlockBlobClientByDownloadKey = async(container, downloadKey, homeAccountId) => {
  const bsc = createBlobServiceClient(homeAccountId);
  const cc = bsc.getContainerClient(container);
  const iter = cc.findBlobsByTags(`downloadKey='${downloadKey}'`);
  const blob = (await iter.next()).value;
  return cc.getBlockBlobClient(blob.name);
}

router.get('/:container/:downloadKey', wrap(async(req, res, next) => {
  const bc = await getBlockBlobClientByDownloadKey(req.params.container, req.params.downloadKey, req.session.homeAccountId);
  const props = kv(await bc.getProperties(), ['_response']);
  res.render('file', {
    props,
    title: bc._name,
    downloadLink:`/download/${req.params.container}/${req.params.downloadKey}/content`
  });
}), errorHandler);

router.get('/:container/:downloadKey/content', wrap(async(req, res, next) => {
  const bc = await getBlockBlobClientByDownloadKey(req.params.container, req.params.downloadKey, req.session.homeAccountId);
  res.attachment(bc._name);
  const downloadResponse = await bc.download();
  const stream = downloadResponse.readableStreamBody;
  stream.on('error', next).pipe(res);
}), errorHandler);

module.exports = router;
