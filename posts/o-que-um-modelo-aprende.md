---
title: O que um modelo de ML realmente “aprende”
date: 2026-09-21
tags: [machine-learning, matematica]
---

Um modelo não “entende” o fenômeno. Ele ajusta parâmetros $\theta$ para que uma função $f_\theta$ erre pouco num conjunto de treino. O verbo certo não é aprender, é **ajustar**.

$$
\hat{\theta} = \arg\min_{\theta} \frac{1}{n}\sum_{i=1}^{n} \ell(y_i, f_\theta(x_i))
$$

Se os dados não representam o mundo em que você vai usar o modelo, o mínimo dessa soma não serve para quase nada. Isso não é detalhe estatístico — é o ponto.
