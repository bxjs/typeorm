#!/bin/bash

# TO DEBUG TYPEORM IN TARGET PROJECT

cd original
tsc
ROOT=$PWD
PROJECT=/Users/chujinghui/Desktop/work/xux-fc-online-projects/alilang-asset-publish-system
cp -rvf $ROOT/build/compiled/src/* $PROJECT/node_modules/@bxjs/typeorm
