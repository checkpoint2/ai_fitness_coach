# Exercise Media Source Manifest

**Status: VERIFIED EXTERNAL EDITORIAL SOURCES / RUNTIME SAMPLE BUNDLED**

This manifest records the reviewed exercise-media binaries without placing source packages and
storyboards in Git. The canonical editorial archive and its backup are stored outside the repository
under the logical root `AI Fitness Coach Media/exercise-media/v1`. Machine-specific absolute paths
are intentionally not part of the project contract.

## Runtime assets in Git

These are the only exercise-media files imported by the mobile application.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `posters/bodyweight-squat.png` | 2,040,576 | `c40a3aad1318466178bf847f76f7b165d12f9183e926d28b965b3a354cc7f979` |
| `videos/bodyweight-squat.mp4` | 1,866,254 | `8f9c50943e2088aae9094f191896f118523e68bfcae4cdf03c299af3850bb64e` |

The runtime mapping is versioned by `exercise/bodyweight-squat/v1`. Unknown media keys fail closed
to the reviewed text instruction.

## External source package

| Logical path | Bytes | SHA-256 |
| --- | ---: | --- |
| `character/AI_EXERCISE_CHARACTER_PACK_V1.zip` | 10,385,400 | `2f23ce98934685e746c75822d3c9cab08410e3c21fc5148d89a3d04301f2729d` |

The archive contains five synthetic athlete reference images and
`CODEX_EXERCISE_MEDIA_WORKFLOW.md`. It is a generation source, not an application asset.

## External approved storyboards

These 21 PNG files are approved editorial references. They are not imported by application code and
do not replace approval of each final moving demonstration.

| Logical path | Bytes | SHA-256 |
| --- | ---: | --- |
| `storyboards/bird-dog.png` | 1,570,594 | `bc9f0d8c1160275d79718088a7e440ef2adc69a9a173d016da0c98c56f96a16d` |
| `storyboards/bodyweight-squat.png` | 1,629,063 | `0999e737071cdf2fee8ac33ca5b6c9a15f1e10a5b71b220d2d6dca0c5278bfc0` |
| `storyboards/dead-bug.png` | 1,440,658 | `f2fcfcb1505dcdca3f4cee38719620ceb3de951f7d0454f0c94ede85d44c8b7b` |
| `storyboards/dumbbell-floor-press.png` | 1,493,533 | `c18e166e94e55e17c5038bae636ae888e0ac0f4f684b4216882ed5b3f6ec0f31` |
| `storyboards/dumbbell-romanian-deadlift.png` | 1,460,123 | `04f3c45ca8515e289ccfebf65946b7ce7e5be7c17086fb35ab975dd99159ffdb` |
| `storyboards/farmers-carry.png` | 1,544,904 | `e3912823d5438880055fbb1855647d0becb1fb0110bec84c9ec6d47d4fadee4d` |
| `storyboards/glute-bridge.png` | 1,552,807 | `9fa0f29be98ed51b9b4b57e826ca7e8a512c1c7ae51a1c762f3cdf7e309c0412` |
| `storyboards/goblet-squat.png` | 1,513,383 | `84bb6054b43df65850c571ea325141cab33928b9bba01a4899298d0bfcb79183` |
| `storyboards/incline-push-up.png` | 1,592,936 | `5869e2e3790408af00753aea6069c8b900021b8150661288ed3f3f1f6637699c` |
| `storyboards/one-arm-dumbbell-row.png` | 1,562,195 | `26699e3da664b9897453b45d94d8eb60d4375f54e057b498cd4324df577e2e72` |
| `storyboards/resistance-band-row.png` | 1,495,257 | `10f4d8aaa31e098e18aaf2cc17e39e85c14dcfa2c97dc0913e687b34c29c125a` |
| `storyboards/seated-cable-row.png` | 1,695,885 | `b303f183a2b20c9efa429b0d803746d4900e94742b6c02c5dbef11f267b6b33c` |
| `storyboards/seated-chest-press.png` | 1,786,149 | `d6c4b9f031aefe97100b74ee4563372f842e09fbd3bd4f3214325ac48624f515` |
| `storyboards/seated-lat-pulldown.png` | 1,654,672 | `0bc3c14bcf15fe781669dab84c86afa7873468c4283d826049afcf6a2bd4e0b1` |
| `storyboards/seated-leg-curl.png` | 2,249,429 | `68d005eec1d32193c65f1d5969226c99ae7d04816f35c7323e7518643259933b` |
| `storyboards/seated-leg-press.png` | 1,908,329 | `1f13975d5bd3b8aed718e91d12a072681447842bd5150151958fad898a758323` |
| `storyboards/sit-to-stand.png` | 1,584,001 | `b5669d2171ff09b9a92a9d1d5dfc9c31c15a93a3e09272ac9535462c22df4942` |
| `storyboards/supported-calf-raise.png` | 1,512,732 | `286baa256c95588ab84b2e64acc063f314438fc8608a7a05c421ab8e536977f1` |
| `storyboards/supported-mini-squat.png` | 1,657,208 | `df897d10c721d3ebf48f2214ba6bf0a19ecf3b6fd3a1f1df5203dadba41673c5` |
| `storyboards/supported-reverse-lunge.png` | 1,493,043 | `98ebda69e0cb3ffce96bd9cc2daf57eda25e9791e3603b4b9d15a5623ebafb55` |
| `storyboards/wall-push-up.png` | 1,547,566 | `3e925a5eb6d1411544a2968ad2149c9c20ef3e89ed3eec940e3487a7beb2c881` |

## Verification and recovery

- Source binary total: 22 files and 44,329,867 bytes.
- The canonical archive and a separate backup were compared byte-for-byte through SHA-256 before
  the repository copies were removed.
- Each external root carries an identical `manifests/SHA256SUMS.txt`.
- Reintroducing the ZIP or storyboard directory into Git is blocked by the root `.gitignore`.
- A future storage-provider migration must preserve logical paths, hashes, review references, and a
  recoverable previous version before the old copy is retired.

This manifest is inventory evidence, not proof that an exercise is safe, medically suitable, or
approved as a final moving demonstration. Editorial status remains in
[`EXERCISE_LIBRARY.md`](EXERCISE_LIBRARY.md).
