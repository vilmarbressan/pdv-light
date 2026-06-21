/**
 * CATÁLOGO DE PRODUTOS — PDV Light
 *
 * Como editar:
 * 1. Adicione ou edite produtos neste array.
 * 2. Coloque as fotos em: images/produtos/nome-do-arquivo.jpg
 * 3. Referencie o nome do arquivo no campo "imagem".
 * 4. Se não tiver foto, deixe imagem: '' e aparecerá um ícone padrão.
 *
 * Categorias disponíveis: defina em CATEGORIAS e use o mesmo nome no produto.
 */

const CATEGORIAS = ['Bebidas', 'Lanches', 'Frios', 'Outros'];

const PRODUTOS = [
  // ── BEBIDAS ──────────────────────────────────────────────────
  {
    id: 1,
    nome: 'Água Mineral 500ml',
    preco: 3.00,
    categoria: 'Bebidas',
    imagem: 'images/produtos/agua_500ml.jpg',
  },
  {
    id: 2,
    nome: 'Refrigerante Lata 350ml',
    preco: 6.00,
    categoria: 'Bebidas',
    imagem: 'images/produtos/refri_lata.jpg',
  },
  {
    id: 3,
    nome: 'Suco de Laranja 300ml',
    preco: 8.00,
    categoria: 'Bebidas',
    imagem: 'images/produtos/suco_laranja.jpg',
  },
  {
    id: 4,
    nome: 'Café Expresso',
    preco: 5.00,
    categoria: 'Bebidas',
    imagem: 'images/produtos/cafe.jpg',
  },
  {
    id: 5,
    nome: 'Cerveja Long Neck',
    preco: 10.00,
    categoria: 'Bebidas',
    imagem: 'images/produtos/cerveja.jpg',
  },
  {
    id: 6,
    nome: 'Chá Gelado 500ml',
    preco: 7.00,
    categoria: 'Bebidas',
    imagem: 'images/produtos/cha_gelado.jpg',
  },

  // ── LANCHES ──────────────────────────────────────────────────
  {
    id: 7,
    nome: 'Coxinha',
    preco: 6.00,
    categoria: 'Lanches',
    imagem: 'images/produtos/coxinha.jpg',
  },
  {
    id: 8,
    nome: 'Pastel de Queijo',
    preco: 7.00,
    categoria: 'Lanches',
    imagem: 'images/produtos/pastel_queijo.jpg',
  },
  {
    id: 9,
    nome: 'Pão de Queijo',
    preco: 4.00,
    categoria: 'Lanches',
    imagem: 'images/produtos/pao_queijo.jpg',
  },
  {
    id: 10,
    nome: 'Esfirra de Carne',
    preco: 5.00,
    categoria: 'Lanches',
    imagem: 'images/produtos/esfirra.jpg',
  },
  {
    id: 11,
    nome: 'Sanduíche Natural',
    preco: 14.00,
    categoria: 'Lanches',
    imagem: 'images/produtos/sanduiche.jpg',
  },
  {
    id: 12,
    nome: 'Misto Quente',
    preco: 9.00,
    categoria: 'Lanches',
    imagem: 'images/produtos/misto.jpg',
  },

  // ── FRIOS ─────────────────────────────────────────────────────
  {
    id: 13,
    nome: 'Iogurte Natural 170g',
    preco: 6.00,
    categoria: 'Frios',
    imagem: 'images/produtos/iogurte.jpg',
  },
  {
    id: 14,
    nome: 'Queijo Mussarela 100g',
    preco: 9.00,
    categoria: 'Frios',
    imagem: 'images/produtos/queijo_mussarela.jpg',
  },
  {
    id: 15,
    nome: 'Presunto 100g',
    preco: 8.00,
    categoria: 'Frios',
    imagem: 'images/produtos/presunto.jpg',
  },
  {
    id: 16,
    nome: 'Manteiga 200g',
    preco: 12.00,
    categoria: 'Frios',
    imagem: 'images/produtos/manteiga.jpg',
  },

  // ── OUTROS ───────────────────────────────────────────────────
  {
    id: 17,
    nome: 'Chocolate ao Leite',
    preco: 7.00,
    categoria: 'Outros',
    imagem: 'images/produtos/chocolate.jpg',
  },
  {
    id: 18,
    nome: 'Biscoito Recheado',
    preco: 4.00,
    categoria: 'Outros',
    imagem: 'images/produtos/biscoito.jpg',
  },
  {
    id: 19,
    nome: 'Chips de Batata 50g',
    preco: 5.00,
    categoria: 'Outros',
    imagem: 'images/produtos/chips.jpg',
  },
  {
    id: 20,
    nome: 'Bala de Goma',
    preco: 2.00,
    categoria: 'Outros',
    imagem: 'images/produtos/bala.jpg',
  },
];
