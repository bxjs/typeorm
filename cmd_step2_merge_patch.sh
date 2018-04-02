#!/bin/bash

cp -rvf modified/src/util/StringUtils.ts typeorm/src/util/StringUtils.ts
cp -rvf modified/package.json  typeorm/package.json
cp -rvf modified/tsconfig.json typeorm/tsconfig.json
