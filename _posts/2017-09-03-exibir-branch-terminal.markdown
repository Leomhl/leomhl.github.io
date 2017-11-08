---
title:  "Exibindo o branch no terminal"
date:   2017-09-03 19:00:00
description: Dica de utilizade pública para não errar seus pushes
---

Salve salve Dev,

se você utiliza Git, com certeja já passou pelo problema de esquecer em qual branch está! Eu constantemente passo por isso, na hora de realizar o push após digitar toda a linha do comando, fico em dúvida se estou enviando para o branch certo, e... Lá vou eu limpar ela e dar o famoso "git branch" para ter certeza de onde estou trabalhando. Com tanta sofrência de fazer isso, resolvi pesquisar e descobri que há uma forma de deixar o branch de trabalho em exibição constantemente no terminal como na imagem abaixo.

![Terminal exibindo o branch](http://leomarinho.com.br/assets/images/posts/2017/09/2017-09-03-exibir-branch-terminal/terminal.png)

No caso acima, eu estava na pasta do blog dentro do branch master. Legal né?
Para fazer isso, é bem simples...

Primeiro abra o arquivo .bash_profile com permissões de root (caso esteja no ubuntu, este procedimento deve ser realizado no .bashrc)

{% highlight SHELL %}
sudo nano ~/.bash_profile
{% endhighlight %}

No final dele, insira as seguintes linhas de comando:


{% highlight SHELL %}
# Git branch in prompt.
parse_git_branch() {
    git branch 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/ (\1)/'
}
export PS1="\u@\h \W\[\033[32m\]\$(parse_git_branch)\[\033[00m\] $ "
{% endhighlight %}

Pronto, basta salvar o arquivo, sair, fechar o terminal e abrir novamente que quando você entrar em uma pasta que é um projeto git ele automáticamente exibirá o branch atual da aplicação.

Espero que esta dica te ajude como me ajudou. Até a próxima ;)
