#!/usr/bin/env python3
"""Fix Portuguese spelling (accents/cedillas) in the proposal HTML."""

import re

# Mapping: unaccented -> accented (lowercase base)
# We'll handle case-insensitive replacement with word boundaries
replacements = {
    # ão / ões
    'gestao': 'gestão', 'imobiliarias': 'imobiliárias', 'operacao': 'operação',
    'situacao': 'situação', 'condicoes': 'condições', 'condicao': 'condição',
    'informacao': 'informação', 'informacoes': 'informações', 'edicao': 'edição',
    'atualizacao': 'atualização', 'geracao': 'geração', 'redistribuicao': 'redistribuição',
    'simulacao': 'simulação', 'simulacoes': 'simulações', 'configuracao': 'configuração',
    'instalacao': 'instalação', 'utilizacao': 'utilização', 'apresentacao': 'apresentação',
    'validacao': 'validação', 'intervencao': 'intervenção', 'insatisfacao': 'insatisfação',
    'implantacao': 'implantação', 'emissao': 'emissão', 'disposicao': 'disposição',
    'reducao': 'redução', 'eliminacao': 'eliminação', 'conversao': 'conversão',
    'contratacao': 'contratação', 'orcamentaria': 'orçamentária', 'relacoes': 'relações',
    'dimensoes': 'dimensões', 'anuncios': 'anúncios', 'funcionalidades': 'funcionalidades',
    'experiencia': 'experiência', 'eficiencia': 'eficiência', 'frequencia': 'frequência',
    'dependencia': 'dependência', 'competencia': 'competência', 'adicional': 'adicional',

    # á / à / â
    'agil': 'ágil', 'ageis': 'ágeis', 'ja': 'já',
    'ate': 'até', 'apos': 'após', 'alem': 'além', 'Alem': 'Além',
    'nao': 'não', 'sao': 'são', 'serao': 'serão',
    'esta': 'está', 'necessario': 'necessário', 'minimo': 'mínimo', 'minima': 'mínima',
    'previssivel': 'previsível', 'acessivel': 'acessível', 'possivel': 'possível',
    'unifica': 'única', 'basica': 'básica', 'tecnica': 'técnica',

    # é / ê
    'numeros': 'números', 'tres': 'três', 'mes': 'mês',
    'media': 'média', 'medio': 'médio', 'hipotese': 'hipótese',
    'tambem': 'também', 'genericas': 'genéricas', 'especifico': 'específico',
    'tipico': 'típico', 'criticas': 'críticas',

    # í
    'imoveis': 'imóveis', 'rapido': 'rápido',
    'precos': 'preços', 'preco': 'preço',
    'disponiveis': 'disponíveis', 'servico': 'serviço',
    'inicial': 'inicial',  # check if this one actually needs accent - no, 'inicial' is correct
    'usuarios': 'usuários', 'inclusos': 'incluídos', 'inicial': 'inicial',
    'reune': 'reúne', 'continuas': 'contínuas',

    # ó / ô
    'modulo': 'módulo', 'modulos': 'módulos',
    'orcamentaria': 'orçamentária',

    # ú
    'calcula': 'cálcula',
    'calculadora': 'calculadora',  # correct, no accent needed
    'calculclos': 'cálculos',

    # Other
    'mao': 'mão', 'nao': 'não',
    'percussao': 'percepção', 'percepcao': 'percepção',
    'concorrencia': 'concorrência', 'visao': 'visão',
    'descricao': 'descrição', 'beneficios': 'benefícios',
    'instantanea': 'instantânea', 'instantaneo': 'instantâneo',
    'prioritario': 'prioritário', 'analise': 'análise',
    'cenario': 'cenário', 'cenarios': 'cenários',
    'multiplos': 'múltiplos', 'friccao': 'fricção',
    'mudanca': 'mudança', 'reuniao': 'reunião',
    'sessao': 'sessão', 'periodo': 'período',
    'versoes': 'versões', 'niveis': 'níveis',
    'precisao': 'precisão', 'registrada': 'registrada',  # correct
    'solucao': 'solução', 'negocios': 'negócios',
    'acessivel': 'acessível', 'configuracao': 'configuração',
}

# Build a comprehensive list with all forms
all_replacements = {
    # ão words
    'gestao': 'gestão', 'Gestao': 'Gestão',
    'imobiliarias': 'imobiliárias', 'Imobiliarias': 'Imobiliárias',
    'operacao': 'operação', 'Operacao': 'Operação',
    'situacao': 'situação', 'Situacao': 'Situação',
    'condicoes': 'condições', 'Condicoes': 'Condições',
    'condicao': 'condição', 'Condicao': 'Condição',
    'informacao': 'informação', 'Informacao': 'Informação',
    'informacoes': 'informações', 'Informacoes': 'Informações',
    'edicao': 'edição', 'Edicao': 'Edição',
    'atualizacao': 'atualização', 'Atualizacao': 'Atualização',
    'geracao': 'geração', 'Geracao': 'Geração',
    'redistribuicao': 'redistribuição', 'Redistribuicao': 'Redistribuição',
    'simulacao': 'simulação', 'Simulacao': 'Simulação',
    'simulacoes': 'simulações', 'Simulacoes': 'Simulações',
    'configuracao': 'configuração', 'Configuracao': 'Configuração',
    'instalacao': 'instalação', 'Instalacao': 'Instalação',
    'utilizacao': 'utilização', 'Utilizacao': 'Utilização',
    'apresentacao': 'apresentação', 'Apresentacao': 'Apresentação',
    'validacao': 'validação', 'Validacao': 'Validação',
    'intervencao': 'intervenção', 'Intervencao': 'Intervenção',
    'insatisfacao': 'insatisfação', 'Insatisfacao': 'Insatisfação',
    'implantacao': 'implantação', 'Implantacao': 'Implantação',
    'emissao': 'emissão', 'Emissao': 'Emissão',
    'disposicao': 'disposição', 'Disposicao': 'Disposição',
    'reducao': 'redução', 'Reducao': 'Redução',
    'eliminacao': 'eliminação', 'Eliminacao': 'Eliminação',
    'conversao': 'conversão', 'Conversao': 'Conversão',
    'contratacao': 'contratação', 'Contratacao': 'Contratação',
    'orcamentaria': 'orçamentária', 'Orcamentaria': 'Orçamentária',
    'relacoes': 'relações', 'Relacoes': 'Relações',
    'dimensoes': 'dimensões', 'Dimensoes': 'Dimensões',
    'anuncios': 'anúncios', 'Anuncios': 'Anúncios',
    'experiencia': 'experiência', 'Experiencia': 'Experiência',
    'eficiencia': 'eficiência', 'Eficiencia': 'Eficiência',
    'dependencia': 'dependência', 'Dependencia': 'Dependência',
    
    # á / à / â
    'agil': 'ágil', 'Agil': 'Ágil',
    'ageis': 'ágeis', 'Ageis': 'Ágeis',
    'ja ': 'já ', 'ja,': 'já,',  # ja followed by space or comma
    'ate ': 'até ', 'Ate ': 'Até ',
    'apos ': 'após ', 'Apos ': 'Após ',
    'alem ': 'além ', 'Alem ': 'Além ',
    'nao ': 'não ', 'nao,': 'não,','Nao ': 'Não ',
    'sao ': 'são ',
    'serao ': 'serão ', 'Serao ': 'Serão ',
    'esta ': 'está ',
    'necessario': 'necessário', 'Necessario': 'Necessário',
    'minimo': 'mínimo', 'Minimo': 'Mínimo',
    'minima': 'mínima', 'Minima': 'Mínima',
    'previsivel': 'previsível', 'Previsivel': 'Previsível',
    'acessivel': 'acessível', 'Acessivel': 'Acessível',
    'possivel': 'possível', 'Possivel': 'Possível',
    'unica': 'única', 'Unica': 'Única',
    'basico': 'básico', 'Basico': 'Básico',
    'tecnica': 'técnica', 'Tecnica': 'Técnica',
    'tecnico': 'técnico', 'Tecnico': 'Técnico',
    
    # é / ê
    'numeros': 'números', 'Numeros': 'Números',
    'tres ': 'três ',
    'mes ': 'mês ', '/mes': '/mês',
    'media ': 'média ',
    'medio ': 'médio ',
    'hipotese': 'hipótese', 'Hipotese': 'Hipótese',
    'tambem': 'também', 'Tambem': 'Também',
    'genericas': 'genéricas', 'Genericas': 'Genéricas',
    'especifico': 'específico', 'Especifico': 'Específico',
    'tipico': 'típico', 'Tipico': 'Típico',
    'criticas': 'críticas', 'Criticas': 'Críticas',
    
    # í
    'imoveis': 'imóveis', 'Imoveis': 'Imóveis',
    'rapido': 'rápido', 'Rapido': 'Rápido',
    'precos': 'preços', 'Precos': 'Preços',
    'preco ': 'preço ', 'preco,': 'preço,',
    'disponiveis': 'disponíveis', 'Disponiveis': 'Disponíveis',
    'servico': 'serviço', 'Servico': 'Serviço',
    'usuarios': 'usuários', 'Usuarios': 'Usuários',
    'incluidos': 'incluídos', 'Incluidos': 'Incluídos',
    'reune': 'reúne', 'Reune': 'Reúne',
    'continuas': 'contínuas', 'Continuas': 'Contínuas',
    
    # ó / ô
    'modulo': 'módulo', 'Modulo': 'Módulo',
    'modulos': 'módulos', 'Modulos': 'Módulos',
    
    # ú
    'calculador': 'calculador',  # no accent
    
    # Other
    'mao': 'mão', 'Mao': 'Mão',
    'percepcao': 'percepção', 'Percepcao': 'Percepção',
    'concorrencia': 'concorrência', 'Concorrencia': 'Concorrência',
    'visao': 'visão', 'Visao': 'Visão',
    'descricao': 'descrição', 'Descricao': 'Descrição',
    'beneficios': 'benefícios', 'Beneficios': 'Benefícios',
    'instantanea': 'instantânea', 'Instantanea': 'Instantânea',
    'instantaneo': 'instantâneo', 'Instantaneo': 'Instantâneo',
    'prioritario': 'prioritário', 'Prioritario': 'Prioritário',
    'analise': 'análise', 'Analise': 'Análise',
    'cenario': 'cenário', 'Cenario': 'Cenário',
    'cenarios': 'cenários', 'Cenarios': 'Cenários',
    'multiplos': 'múltiplos', 'Multiplos': 'Múltiplos',
    'friccao': 'fricção', 'Friccao': 'Fricção',
    'mudanca': 'mudança', 'Mudanca': 'Mudança',
    'reuniao': 'reunião', 'Reuniao': 'Reunião',
    'sessao': 'sessão', 'Sessao': 'Sessão',
    'periodo': 'período', 'Periodo': 'Período',
    'versoes': 'versões', 'Versoes': 'Versões',
    'niveis': 'níveis', 'Niveis': 'Níveis',
    'precisao': 'precisão', 'Precisao': 'Precisão',
    'solucao': 'solução', 'Solucao': 'Solução',
    'negocios': 'negócios', 'Negocios': 'Negócios',
    'calculclos': 'cálculos', 'Calculos': 'Cálculos',  # typo fix too
}

# Read file
with open('/home/z/my-project/scripts/proposta_comercial.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Apply replacements (longer keys first to avoid partial matches)
for wrong, correct in sorted(all_replacements.items(), key=lambda x: -len(x[0])):
    content = content.replace(wrong, correct)

# Fix date
content = content.replace('Agosto de 2025', 'Agosto de 2026')

# Write back
with open('/home/z/my-project/scripts/proposta_comercial.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Spelling corrections applied successfully.')
print(f'Total replacement rules: {len(all_replacements)}')
