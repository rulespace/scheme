Incremental bottom-up Scheme evaluation
=======================================


Installation (developer)
------------------------

```
git clone https://gitlab.soft.vub.ac.be/rulespace/common.git
git clone https://gitlab.soft.vub.ac.be/rulespace/rulespace.git
git clone https://gitlab.soft.vub.ac.be/rulespace/scheme.git
cd common
npm link
cd ..
cd rulespace
npm link common
npm link
cd ..
cd scheme
npm link rulespace
npm test
```
