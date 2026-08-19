# Black Harvest FPS 日本語版

今回アップロードされたIPAを再解析して作り直したWeb版FPSプロトタイプ。

## IPAから確認した戦闘系
- PlayerController
- RangedWeapon / RangedWeaponSO
- MeleeWeapon / MeleeWeaponInteraction
- Bullet
- Shoot / ShootDistance
- ShootSoundRadius
- Reload / reloadable / ReloadData
- Recoil
- Damage / MaxHealth / currentHealth
- CameraInput
- CameraRotateSensitivity
- Cinemachine3rdPersonAim

## 重要
IPA内部には `Cinemachine3rdPersonAim` が存在するため、原作のカメラ実装は厳密には三人称要素を含む。
ただしユーザー指定のBlack Harvest Web版は**FPS（一人称）**として再構築する。

## この版
- 一人称カメラ
- WASD移動
- マウス視点
- 射撃
- リロード
- 弾数
- 反動
- HP
- 敵
- ダメージ
- 簡易3D街
- 建物
- 日本語HUD
- モバイルタッチ操作
- 全ファイル直下
- GitHub Pages対応

Three.jsはCDNから読み込むため、npm不要。
