---
layout: post
title: "clangの警告オプション一覧表示スクリプト"
tags: [programming, devtools, qiita]
permalink: clang_warnings
---

# clangの警告オプション一覧表示スクリプト

## はじめに

gccとclangでは`-Wall`に含まれるオプションが異なる。例えばgccの`-Wall`には`-Wmissing-braces`が含まれないが、clangの`-Wall`には含まれる。で、そもそもclang/clang++の`-Wall`に何が含まれているのか、ちょっと探してみたがわかりやすい一覧が見つからなかったので、警告オプションをリストアップするスクリプトを書いた。

## スクリプト

clangのコンパイルオプションは[DiagnosticGroups.td](https://github.com/llvm-mirror/clang/blob/master/include/clang/Basic/DiagnosticGroups.td)に定義されている。これをパースして、allを定義すると何が定義されたか再帰的に調べてリストアップする手抜きスクリプトは以下の通り。

```rb
list = Array.new

str = ""
while line=gets
  next if line=~/^\s*\/\//
  next if line.chomp.strip == ""
  str = str + line.chomp.strip
  if line=~/\;/
    list.push str
    str = ""
  end
end

class Diag
  def initialize(name, value, array)
    @name = name 
    @value = value
    @array = array
  end
  def isLeaf
    return @array == []
  end
  def show(aliasHash, diagHash, l=0)
    if @array == []
      l.times{print "  "}
      puts @name
    else 
      l.times{print "  "}
      puts @name
      @array.each{|v|
        name = aliasHash[v.strip]
        d = diagHash[name]
        d.show(aliasHash,diagHash,l+1) 
      }
    end
  end
end

diagHash = Hash.new
aliasHash = Hash.new

list.each{|line|
  if line=~/def(.*): DiagGroup<\"(.*)\".*,.*\[(.*)\]>/
    a = $1.strip
    name = $2.strip
    array = $3.split(/,/)
    d = Diag.new(name,a, array)
    diagHash[name] = d
    aliasHash[a] = name if a != ""
  elsif line=~/def (.*)\s*:\s*DiagGroup<\"(.*)\">/
    a = $1.strip
    name = $2.strip
    d = Diag.new(name, a, [])
    diagHash[name] = d
    aliasHash[a] = name if a != ""
  end
}

diagHash["all"].show(aliasHash, diagHash)
```

パース漏れがあったらすみません。

## 実行結果

上記スクリプトにDiagnosticGroups.tdを食わせると、以下の出力を得る。

```shell-session
$ ruby diag.rb DiagnosticGroups.td 
all
  most
    char-subscripts
    comment
    delete-non-virtual-dtor
    format
      format-extra-args
      format-zero-length
      nonnull
      format-security
      format-y2k
      format-invalid-specifier
    implicit
      implicit-function-declaration
      implicit-int
    infinite-recursion
    mismatched-tags
    missing-braces
    move
      pessimizing-move
      redundant-move
      self-move
    multichar
    reorder
    return-type
      return-type-c-linkage
    self-assign
      self-assign-field
    self-move
    sizeof-array-argument
    sizeof-array-decay
    string-plus-int
    trigraphs
    uninitialized
      sometimes-uninitialized
      static-self-init
    unknown-pragmas
    unused
      unused-argument
      unused-function
        unneeded-internal-declaration
      unused-label
      unused-private-field
      unused-local-typedef
      unused-value
        unused-comparison
        unused-result
        unevaluated-expression
          potentially-evaluated-expression
      unused-variable
        unused-const-variable
      unused-property-ivar
    volatile-register-var
    objc-missing-super-calls
    objc-designated-initializers
    overloaded-virtual
    private-extern
    cast-of-sel-type
    extern-c-compat
  parentheses
    logical-op-parentheses
    logical-not-parentheses
    bitwise-op-parentheses
    shift-op-parentheses
    overloaded-shift-op-parentheses
    parentheses-equality
    dangling-else
  switch
  switch-bool
```

つまり、`all`は`most`と`parentheses`と`switch`と`switch-bool`へのエイリアスであり、`most`は`format`を含み、`format`は`format-extra-args`等を含み・・・といったことがわかる。

## まとめ

clang/clang++のコンパイルオプションのエイリアス解決スクリプトを書いた。再帰回数が多いのは`-Wall`だが、他にも`-Wgnu`や`-Wmicrosoft`に何が含まれるかとか表示すると面白かった。
