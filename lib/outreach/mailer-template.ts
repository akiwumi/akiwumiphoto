const RUNNING_FOR_PRESIDENT_IMAGE = 'https://hhmtghcdtmbwmnvfcfue.supabase.co/storage/v1/object/public/gallery-images/galleries/79511ddc-33e1-43dc-93f4-4a58c2791c33/1780169305115-0.jpg';
const POLITICAL_CLOWN_IMAGE = 'https://hhmtghcdtmbwmnvfcfue.supabase.co/storage/v1/object/public/gallery-images/galleries/4bc5c65a-fd4a-4d02-80e7-7a4714e74e74/1780168426204-12.jpg';

export const MAILER_IMAGE_PATHS = {
  runningForPresident: 'galleries/79511ddc-33e1-43dc-93f4-4a58c2791c33/1780169305115-0.jpg',
  politicalClown: 'galleries/4bc5c65a-fd4a-4d02-80e7-7a4714e74e74/1780168426204-12.jpg',
} as const;

export const INTERIOR_DESIGNER_MAILER_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Akiwumi Photo — photographic prints for considered interiors</title>
<style>
body{margin:0;padding:0;background:#e9e9e5;color:#171717;font-family:Georgia,'Times New Roman',serif}table{border-collapse:collapse}img{border:0;display:block;max-width:100%}a{color:inherit}.wrap{width:100%;background:#e9e9e5}.container{width:640px;max-width:640px;margin:0 auto;background:#f8f8f5}.pad{padding-left:58px;padding-right:58px}.eyebrow{font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2.5px;text-transform:uppercase}.headline{font-size:48px;line-height:1.02;font-weight:normal;letter-spacing:-1.5px}.copy{font-size:17px;line-height:1.65}.muted{color:#656560}.button{background:#171717;color:#fff!important;display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.5px;padding:16px 21px;text-decoration:none;text-transform:uppercase}.button-light{background:#deded8;color:#171717!important}.rule{border-top:1px solid #c9c9c2}
@media only screen and (max-width:680px){.container{width:100%!important}.pad{padding-left:26px!important;padding-right:26px!important}.headline{font-size:39px!important}.copy{font-size:16px!important}.stack{display:block!important;width:100%!important}.stack-pad{padding:0 0 20px 0!important}}
</style>
</head>
<body>
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">A quiet introduction to the photographic work and limited-edition prints of Eugene “Pebbles” Akiwumi.</div>
<table role="presentation" class="wrap" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" class="container" width="640" cellpadding="0" cellspacing="0">
<tr><td class="pad" style="padding-top:28px;padding-bottom:25px"><table role="presentation" width="100%"><tr><td class="eyebrow">AKIWUMI PHOTO</td><td align="right" class="eyebrow muted">Stockholm · Ghana</td></tr></table></td></tr>
<tr><td><img src="https://www.akiwumiphoto.com/images/intro-background.jpg" width="640" alt="Black and white photograph of a rocky landscape beneath a cloudy sky" style="width:100%;height:auto"></td></tr>
<tr><td class="pad" style="padding-top:48px;padding-bottom:38px"><div class="eyebrow muted" style="margin-bottom:18px">A photographic invitation</div><div class="headline">Photography<br><em>for considered interiors.</em></div></td></tr>
<tr><td class="pad"><div class="rule"></div></td></tr>
<tr><td class="pad" style="padding-top:34px;padding-bottom:26px"><div class="copy">Hello {{first_name}},<br><br>I’m Eugene “Pebbles” Akiwumi, a British-Ghanaian photographer, filmmaker, director and producer based in Stockholm.<br><br>My work moves between documentary, portraiture, editorial photography, social-impact films and fine-art photography. I’m drawn to people, memory, culture and history—and to the details that give a place its sense of character.<br><br>I’m writing to introduce you to Akiwumi Photo: a collection of photographic works available as limited-edition prints.<br><br>The images bring story, atmosphere and visual depth into a space. They are made for interiors that feel considered, personal and quietly expressive.</div></td></tr>
<tr><td class="pad" style="padding-bottom:38px"><table role="presentation" width="100%"><tr><td class="stack stack-pad" width="50%" valign="top" style="padding-right:9px"><img src="${RUNNING_FOR_PRESIDENT_IMAGE}" width="253" alt="Running For President — photograph by Eugene Akiwumi" style="width:100%;height:auto"><div class="eyebrow muted" style="padding-top:11px">Running For President</div></td><td class="stack" width="50%" valign="top" style="padding-left:9px"><img src="${POLITICAL_CLOWN_IMAGE}" width="253" alt="The Political Clown — documentary photograph by Eugene Akiwumi" style="width:100%;height:auto"><div class="eyebrow muted" style="padding-top:11px">The Political Clown</div></td></tr></table></td></tr>
<tr><td class="pad" style="padding-bottom:40px"><div class="copy">You’re warmly invited to explore the collection and see whether any of the work might be right for a project, client or personal space. If you have a question about a photograph, print size, edition or framing, I’d be happy to hear from you.</div><table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px"><tr><td style="padding-right:9px"><a class="button" href="https://www.akiwumiphoto.com/home">Explore the work</a></td><td><a class="button button-light" href="https://www.akiwumiphoto.com/prints">View prints</a></td></tr></table></td></tr>
<tr><td class="pad"><div class="rule"></div></td></tr><tr><td class="pad" style="padding-top:30px;padding-bottom:42px"><div class="copy">Warmly,<br>Eugene “Pebbles” Akiwumi</div><div class="eyebrow muted" style="padding-top:19px;line-height:1.8">Akiwumi Photo<br>Stockholm · Ghana · Everywhere in between<br><a href="mailto:hello@akiwumiphoto.com" style="text-decoration:underline">hello@akiwumiphoto.com</a></div></td></tr>
<tr><td class="pad" style="background:#171717;color:#fff;padding-top:20px;padding-bottom:20px"><table role="presentation" width="100%"><tr><td class="eyebrow" style="color:#fff">Akiwumi Photo</td><td align="right" class="eyebrow"><a href="https://www.akiwumiphoto.com/contact" style="color:#fff;text-decoration:underline">Get in touch →</a></td></tr></table></td></tr>
</table></td></tr></table>
</body></html>`;

export const INTERIOR_DESIGNER_MAILER_TEXT = `Hello {{first_name}},

I’m Eugene “Pebbles” Akiwumi, a British-Ghanaian photographer, filmmaker, director and producer based in Stockholm.

My work moves between documentary, portraiture, editorial photography, social-impact films and fine-art photography. I’m drawn to people, memory, culture and history—and to the details that give a place its sense of character.

I’m writing to introduce you to Akiwumi Photo: a collection of photographic works available as limited-edition prints.

The images bring story, atmosphere and visual depth into a space. Explore the work: https://www.akiwumiphoto.com/home
View prints: https://www.akiwumiphoto.com/prints

Warmly,
Eugene “Pebbles” Akiwumi
Akiwumi Photo · Stockholm · Ghana · Everywhere in between`;

export const INTERIOR_DESIGNER_MAILER_SUBJECT = 'Photography for considered interiors';

export function buildInteriorDesignerMailerHtml(images?: { runningForPresident?: string | null; politicalClown?: string | null }): string {
  return INTERIOR_DESIGNER_MAILER_HTML
    .replaceAll(RUNNING_FOR_PRESIDENT_IMAGE, images?.runningForPresident || RUNNING_FOR_PRESIDENT_IMAGE)
    .replaceAll(POLITICAL_CLOWN_IMAGE, images?.politicalClown || POLITICAL_CLOWN_IMAGE);
}
