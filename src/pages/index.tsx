import { GetStaticProps } from 'next';
import Head from 'next/head';
import Prismic from '@prismicio/client';
import { AiOutlineUser, AiOutlineCalendar } from 'react-icons/ai';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { useState } from 'react';
import Link from 'next/link';
import { getPrismicClient } from '../services/prismic';
import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';
import Header from '../components/Header';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const postFormated = postsPagination.results.map(post => {
    return {
      ...post,
      first_publication_date: format(
        new Date(post.first_publication_date),
        'dd MMM yyyy',
        { locale: ptBR }
      )
    }
  });
  // Todos os Posts
  const [posts, setPosts] = useState<Post[]>(postFormated);
  // Pagina atual
  const [currentPage, setCurrentPage] = useState(1);
  //  Proxima Pagina
  const [nextPage, setNextPage] = useState(postsPagination.next_page);

  // Funcao para carragar mais posts
  const loadMorePosts = async (): Promise<void> => {
    // Verificar se possui proxima pagina
    if (nextPage === null) {
      return;
    }

    // Coletar os posts da proxima pagina
    const nextPosts = await fetch(nextPage).then(response => response.json());

    // setar o dados da proxima pagina
    setNextPage(nextPosts.next_page);
    // setar os novos dados da pagina
    setCurrentPage(nextPosts.page);

    // mostrar todos os novos dados
    const newPosts = nextPosts.results.map(post => {
      return {
        uid: post.uid,
        first_publication_date: format(
          new Date(post.first_publication_date),
          'dd MMM yyyy',
          { locale: ptBR }
        ),
        data: {
          title: post.data.title,
          subtitle: post.data.subtitle,
          author: post.data.author,
        },
      };
    });

    // seguindo a imutabilidade, passandos o os posts antigo com os novos posts
    setPosts([...posts, ...newPosts]);
  };

  return (
    <>
      <Head>
        <title>Home | nar0nBlog</title>
      </Head>
      <Header />
      <main className={commonStyles.container}>
        <div className={styles.posts}>
          {posts.map(post => (
            <Link href={`/post/${post.uid}`} key={post.uid}>
              <a>
                <h1>{post.data.title}</h1>
                <h2>{post.data.subtitle}</h2>
                <time>
                  <AiOutlineCalendar /> {post.first_publication_date}
                </time>
                <span className={styles.author}>
                  <AiOutlineUser /> {post.data.author}
                </span>
              </a>
            </Link>
          ))}
          {nextPage && (
            <button type="button" onClick={loadMorePosts}>
              Carregar mais posts
            </button>
          )}
        </div>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();

  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author', 'posts.content'],
      pageSize: 1,
    }
  );
  // console.log(JSON.stringify(postsResponse, null, 2)); // para ver objetos
  const results = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  const postsPagination = {
    next_page: postsResponse.next_page,
    results,
  };

  return {
    props: {
      results,
      postsPagination,
    },
    revalidate: 60 * 60 * 24, // 24 hours
  };
};
