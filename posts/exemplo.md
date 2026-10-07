---
title: Template para os posts
date: 2026-10-04
tags: [template]
---

Este arquivo é o modelo. Copie-o, troque o nome (o *slug* vira o nome do arquivo, sem `.md`) e acrescente o slug em `posts.json`.

O título, a data e as tags vivem **só** no frontmatter — não repita um `# Título` no corpo.

## Matemática inline

A identidade de Euler cabe numa frase: $e^{i\pi} + 1 = 0$. Subscritos também: a sequência $a_n = 1/n$ vai a zero.

## Matemática em bloco

Delimitadores de bloco: dois cifrões, sozinhos, numa linha antes e outra depois da fórmula. Se a equação for mais larga que a tela, o scroll horizontal fica só neste bloco.

$$
\int_{-\infty}^{\infty} e^{-x^2}\, dx = \sqrt{\pi}
$$

Uma fração um pouco mais longa, típica de texto aplicado:

$$
\mathbb{P}(A \mid B) = \frac{\mathbb{P}(B \mid A)\,\mathbb{P}(A)}{\mathbb{P}(B)}
$$

## Código

Trechos de código vão em cerca. O `_` aqui **não** vira itálico, e o MathJax não tenta renderizar o que está dentro.

```python
def softmax(x):
    e = np.exp(x - x.max())
    return e / e.sum()
```

O restante é Markdown normal: **negrito**, *itálico*, [links](https://youtube.com/) e listas.

- Um post novo = um `.md` em `/posts/` + o slug em `posts.json`.
- Tags no frontmatter, sem `#`. Na timeline elas aparecem como `#matematica`.
