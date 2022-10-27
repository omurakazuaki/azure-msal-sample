const express = require('express');
const createError = require('http-errors');
const router = express.Router();
const { wrap, kv } = require('../utils');
const { BlobServiceClient } = require('@azure/storage-blob');

const errorHandler = (err, req, res, next) => {
  console.error(err);
  next(createError(err.statusCode));
};

const createBlobServiceClient = (token) => {
  return new BlobServiceClient(
    `https://${process.env.STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
    { getToken: async() => {
      return {
        token: token.accessToken,
        expiresOnTimestamp: token.idTokenClaims.exp * 1000
      }
    }}
  );
}

const getBlockBlobClientByDownloadKey = async(req) => {
  const bsc = createBlobServiceClient(req.user);
  const cc = bsc.getContainerClient(req.params.container);
  const iter = cc.findBlobsByTags(`downloadKey='${req.params.downloadKey}'`);
  const blob = (await iter.next()).value;
  return cc.getBlockBlobClient(blob.name);
}

router.get('/:container/:downloadKey', wrap(async(req, res, next) => {
  const bc = await getBlockBlobClientByDownloadKey(req);
  const props = kv(await bc.getProperties(), ['_response']);
  res.render('file', {
    props,
    title: bc._name,
    downloadLink:`/download/${req.params.container}/${req.params.downloadKey}/content`
  });
}), errorHandler);

router.get('/:container/:downloadKey/content', wrap(async(req, res, next) => {
  const bc = await getBlockBlobClientByDownloadKey(req);
  res.attachment(bc._name);
  const downloadResponse = await bc.download();
  const stream = downloadResponse.readableStreamBody;
  stream.on('error', next).pipe(res);
}), errorHandler);

module.exports = router;
