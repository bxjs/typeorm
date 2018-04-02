#!/bin/bash

cd typeorm
yarn install
tsc
npm login --registry=https://registry.npmjs.org/ --scope=@bxjs
cp -rvf package.json build/compiled/src/
npm publish ./build/compiled/src --access=public
