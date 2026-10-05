---
title: "Bayes na vida real: testar não é saber"
date: 2026-05-18
tags: [matematica, machine-learning]
---

Um teste com 99% de precisão ainda pode estar errado na maior parte das vezes, se a coisa testada for rara. Isso não é paradoxo — é a regra de Bayes.

$$
\mathbb{P}(\text{doente} \mid \text{positivo}) = \frac{\mathbb{P}(\text{positivo} \mid \text{doente})\,\mathbb{P}(\text{doente})}{\mathbb{P}(\text{positivo})}
$$

O denominador carrega os falsos positivos da maioria saudável. Sem a prevalência $\mathbb{P}(\text{doente})$, o número “99%” não diz o que você pensa que diz.
