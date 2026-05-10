import ReadableText from './ReadableText';

export default function ReadAloudButton({ text, languageCode = 'en-GB', label = 'Read Aloud', compact = false }) {
  return <ReadableText text={text} languageCode={languageCode} label={label} compact={compact} showText={false} />;
}
