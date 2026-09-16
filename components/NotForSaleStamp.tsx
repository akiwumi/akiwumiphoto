/**
 * Floats over the bottom of a photograph marked not for sale, on gallery
 * tiles, in the lightbox and on admin thumbnails. It is decoration over the
 * image, so it never takes pointer events from the tile or lightbox beneath.
 */
export default function NotForSaleStamp({ size = 'full', raised = false }: {
  size?: 'full' | 'small';
  /** Lifts the stamp clear of a title and description along the bottom edge. */
  raised?: boolean;
}) {
  const classes = ['not-for-sale-stamp', size === 'small' && 'not-for-sale-stamp-small', raised && 'not-for-sale-stamp-raised'];
  return (
    <div className={classes.filter(Boolean).join(' ')}>
      Not for sale
    </div>
  );
}
