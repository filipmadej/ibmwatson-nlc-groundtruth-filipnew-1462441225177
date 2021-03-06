/**
 * Copyright 2015 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

'use strict';
/*eslint func-names: 0, max-nested-callbacks: 0, max-statements: 0, handle-callback-err: 0 */

// core dependencies
var util = require('util');

// external dependencies
var async = require('async');
var chai = require('chai');
var httpstatus = require('http-status');
var proxyquire = require('proxyquire').noPreserveCache();
var request = require('supertest');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var uuid = require('node-uuid');

var should = chai.should();
chai.use(sinonChai);

// test dependencies
var mocks = require('./test/mocks');

var should = chai.should();

var storeMock = new mocks.StoreMock();
storeMock['@global'] = true;

var errorMsg = 'test-generated';

// Need a reference to a module so we can stub
// it out to test the uncaught exception handling
var authController = require('./api/authenticate/authenticate.controller');
sinon.stub(authController, 'logout', function () {
  throw new Error(errorMsg);
});
authController['@global'] = true;

var app = proxyquire('./app', {
  './config/db/store' : storeMock,
  '../../config/db/store' : storeMock,
  './authenticate.controller' : authController,
  'watson-developer-cloud' : new mocks.WDCMock()
});

describe('/server/routes', function () {

  var TENANT = 'nlc-test';
  var ENDPOINTBASE = '/api/' + TENANT + '/texts';

  this.timeout(5000);

  after(function () {
    authController.logout.restore();
  });

  beforeEach(function () {
    storeMock.reset();
  });

  it('should redirect to index.html for non-existent routes', function (done) {
    request(app)
      .get('/does/not/exist')
      .expect('Content-Type', /html/)
      .expect(httpstatus.OK, done);
  });

  it('should redirect to error page for invalid routes', function (done) {
    request(app)
      .get('/api/does/not/exist')
      .expect('Content-Type', /html/)
      .expect(httpstatus.NOT_FOUND, done);
  });

  it('should handle uncaught exceptions', function (done) {
    request(app)
      .post('/api/authenticate/logout')
      .expect('Content-Type', /json/)
      .expect(httpstatus.INTERNAL_SERVER_ERROR)
      .end(function (err, resp) {
        resp.should.have.deep.property('body.error', errorMsg);
        done(err);
      });
  });

});
