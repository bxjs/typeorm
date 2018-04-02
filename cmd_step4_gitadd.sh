#!/bin/bash

rm -rf typeorm/.git
rm -rf original
mv typeorm original
rm -rf typeorm

git add .
git commit -m 'release'
git push
