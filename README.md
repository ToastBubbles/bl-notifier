# scrape-escape

This is an agile API scraper that can adjust its user-agents every call and switch its public IP whenever presented with a 403. 

This NodeJS project was built for Raspberry Pi/UNIX server and is powered by openVPN.

Additional features:

-Text-to-Speech Synthesis for anouncements when a desired piece of data is found.

-SendGrid incorporation allows emails to be sent when desired data is found.

-Includes three modes:
 - Look for any object at all
 - Track certain objects by ID and only update upon new listing
 - Track certain objects by ID and only update upon new listing with an attached comment
  
  
