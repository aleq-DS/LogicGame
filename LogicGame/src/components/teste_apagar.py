
dados = input("Digite nome e idade: ").strip().split()
dados[1] = int(dados[1])
print(f"Nome: {dados[0]} | Idade: {dados[1]}")