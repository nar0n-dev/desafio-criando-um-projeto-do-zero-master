import { GetStaticPaths, GetStaticProps } from 'next';

import Prismic from '@prismicio/client';
import Head from 'next/head';
import { getPrismicClient } from '../../services/prismic';
import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Header from '../../components/Header';
import { RichText } from 'prismic-dom';
import { AiOutlineUser, AiOutlineCalendar, AiOutlineFieldTime } from 'react-icons/ai';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/router';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
      alt: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {

  const postFormated = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    { locale: ptBR }
  )

  const totalWords = post.data.content.reduce((accumulate, contentData) => {
    accumulate +=  contentData.heading.split(' ').length

    const wordsBody = contentData.body.map(texts => texts.text.split(' ').length)

    wordsBody.map(wordsBody => (accumulate += wordsBody))

    return accumulate
  }, 0)

  const estimatedReadingTime = Math.ceil(totalWords / 200)

  const router = useRouter();

  if(router.isFallback) {
    return (
      <h1>
        Carregando...
      </h1>
    )
  }


  return (
    <>
      <Head>
        <title>{post.data.title}| nar0nBlog</title>
      </Head>
      <Header />

      <img className={styles.imagePost} src={post.data.banner.url} alt={post.data.banner.alt} />

      <main className={commonStyles.container}>
        <h1 className={styles.title}>{post.data.title}</h1>

        <ul className={styles.infos}>
          <li><AiOutlineCalendar /> {postFormated}</li>
          <li><AiOutlineUser /> {post.data.author}</li>
          <li><AiOutlineFieldTime /> {estimatedReadingTime} min</li>
        </ul>

        {post.data.content.map(content => {
          return (
            <article key={content.heading}>
              <h2 className={styles.subtitle}>{content.heading}</h2>

              <div className={styles.contentPost} dangerouslySetInnerHTML={{__html: RichText.asHtml(content.body)}} />
            </article>
          )
        })}
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'posts'),
  ]);
  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });
  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {

  const { slug } = params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },

      author: response.data.author,
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        }
      }),
    },
  };
  //console.log(JSON.stringify(post, null, 2)); // para ver objetos
  return {
    props: {
      post,
    },
    revalidate: 60 * 60 * 24, // 24 hours
  };
};
