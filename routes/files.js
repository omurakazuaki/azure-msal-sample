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

router.get('/', wrap(async(req, res, next) => {
  const bsc = createBlobServiceClient(req.session.homeAccountId);
  const files = [];
  for await (const container of bsc.listContainers()) {
    files.push({name: container.name, ...container.properties, url: `/files/${container.name}` });
  }

  res.render('files', {
    files,
    title: process.env.STORAGE_ACCOUNT_NAME,
    backUrl: `/`
  });
}), errorHandler);

router.get('/:container', wrap(async(req, res, next) => {
  const bsc = createBlobServiceClient(req.session.homeAccountId);
  const cc = bsc.getContainerClient(req.params.container);
  const files = [];
  for await (const blob of cc.listBlobsFlat()) {
    files.push({ name: blob.name, ...blob.properties, url: `/files/${req.params.container}/${blob.name}` });
  }
  res.render('files', {
    files,
    title: req.params.container,
    uploadUrl: `/files/${req.params.container}/upload`,
    backUrl: `/files/`
  });
}), errorHandler);

class MulterAzureStorage {

  async _handleFile(req, file, cb) {
    const bsc = createBlobServiceClient(req.session.homeAccountId);
    const cc = bsc.getContainerClient(req.params.container);
    const bc = cc.getBlockBlobClient(file.originalname);
    bc.uploadStream(file.stream)
      .then(res => {
        file.blobClient = bc;
        cb(null, res);
      })
      .catch(e => {
        cb(e);
      });
  }

  async _removeFile(req, file, cb) {
    const bsc = createBlobServiceClient(req.session.homeAccountId);
    const cc = bsc.getContainerClient(req.params.container);
    const bc = cc.getBlockBlobClient(file.originalname);
    bc.delete()
      .then(() => {
        cb(null);
      })
      .catch(e => {
        cb(e);
      });
  }
}

const multer  = require('multer');
const e = require('express');
const upload = multer({ storage: new MulterAzureStorage() });

router.post('/:container/upload', upload.array('file', 10), wrap(async(req, res, next) => {
  if (req.files.length === 1) {
    res.redirect(`/files/${req.params.container}/${req.files[0].originalname}`);
  } else {
    res.redirect(`/files/${req.params.container}`);
  }
}), errorHandler);

router.get('/:container/:blob(*)/download', wrap(async(req, res, next) => {
  res.attachment(req.params.blob);
  const bsc = createBlobServiceClient(req.session.homeAccountId);
  const cc = bsc.getContainerClient(req.params.container);
  const bc = cc.getBlockBlobClient(req.params.blob);
  const downloadResponse = await bc.download();
  const stream = downloadResponse.readableStreamBody;
  stream.on('error', next).pipe(res);
}), errorHandler);

router.get('/:container/:blob(*)', wrap(async(req, res, next) => {
  const bsc = createBlobServiceClient(req.session.homeAccountId);
  const cc = bsc.getContainerClient(req.params.container);
  const bc = cc.getBlockBlobClient(req.params.blob);
  const props = kv(await bc.getProperties(), ['_response']);
  res.render('file', {
    props,
    title: req.params.blob,
    downloadUrl:`/files/${req.params.container}/${req.params.blob}/download`,
    backUrl: `/files/${req.params.container}`
  });
}), errorHandler);


module.exports = router;
