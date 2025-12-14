netjoints.com Blog Post URLs for Medium Import
Generated on: December 13, 2025
Total posts found: 40+ (via web search - may not be complete)

HOW TO USE:
1. Go to https://medium.com/p/import
2. Copy one URL at a time
3. Paste and click Import
4. Review the imported draft
5. Publish

NOTE: This list was compiled via web search and may not include all posts.
For a complete list, try the alternative methods below.

## RECENT POSTS (2024-2025) ##

* https://netjoints.com/securing-mcp-servers-for-agentic-ai-a-practical-guide-to-mcp-security-authorization-and-runtime-controls/
* https://netjoints.com/agentic-ai-identities-the-future-of-enterprise-access-control/
* https://netjoints.com/britive-self-service-access-and-permission-builder/
* https://netjoints.com/which-one-is-better-britive-or-cyberark/
* https://netjoints.com/troubleshooting-aws-bedrock-agentcore/
* https://netjoints.com/azure-networking-limitations-and-constraints/
* https://netjoints.com/gcp-networking-limitations/
* https://netjoints.com/whats-the-difference-between-llm-and-dlrm-models/


## BRITIVE / PAM / CYBERSECURITY POSTS ##

https://netjoints.com/britive-api-cli-to-trigger-cloud-data-scan/


## AWS POSTS ##

* https://netjoints.com/aws-control-tower-vending-machine/
* https://netjoints.com/aws-direct-connect-dx/
* https://netjoints.com/direct-connect-gateway/
* https://netjoints.com/aws-direct-connect-and-direct-connect-gateway-limitations/
* https://netjoints.com/aws-nwfw-network-firewall-vs-aviatrix-threatguard-solution/
* https://netjoints.com/aviatrix-user-vpn-deployment-with-aws-udb-based-nlb/


## AVIATRIX / MULTI-CLOUD NETWORKING POSTS ##


* https://netjoints.com/oci-multicloud-transit/
* https://netjoints.com/oci-initial-config/
* https://netjoints.com/aviatrix-kickstart-spin-up-cloud-networks-in-minutes/
* https://netjoints.com/aviatrix-distributed-cloud-firewall-harnessing-open-source-technologies-for-enhanced-security-using-ebpf-and-suricata/
* https://netjoints.com/aviatrix-transit-in-host-project-and-workload-vms-in-shared-vpc-network/
* https://netjoints.com/connecting-aviatrix-gateway-to-cisco-csr-in-the-same-aws-vpc/
* https://netjoints.com/what-is-aviatrix-cloudwan/
* https://netjoints.com/sap-on-aviatrix-platform/
* https://netjoints.com/gcp-shared-vpc-network-with-aviatrix-transit-hub-spoke-architecture/


# GCP POSTS #


* https://netjoints.com/gcp-native-networking-concepts-cheat-sheet/


## PARTNERSHIP / ABOUT PAGES (may not want to import these) ##


* https://netjoints.com/aws/
* https://netjoints.com/about/


## INSTRUCTIONS TO GET COMPLETE LIST ##
Since WordPress export wasn't working for me, here are alternatives: 

OPTION 1: Use your RSS feed
Visit: https://netjoints.com/feed/
This shows your recent posts with URLs

OPTION 2: Use WordPress Sitemap
Try visiting these URLs in your browser:
   - https://netjoints.com/wp-sitemap.xml
   - https://netjoints.com/wp-sitemap-posts-post-1.xml
   - https://netjoints.com/sitemap.xml


OPTION 3: Check if you have a plugin creating sitemap
Popular plugins like Yoast SEO or RankMath create sitemaps
   - https://netjoints.com/sitemap_index.xml
   - https://netjoints.com/post-sitemap.xml

 OPTION 4: Use WordPress REST API in browser
 Visit: https://netjoints.com/wp-json/wp/v2/posts?per_page=100
 This will show all posts in JSON format

 OPTION 5: Check WordPress Admin → Posts → All Posts
 You can see all posts there and manually copy URLs

## Following process worked for me 

I created a Script You Can Run in Browser Console

🚀 Easiest Method (30 seconds)
- Step 1: While on your WordPress Posts page, press F12 (or Cmd+Option+I on Mac) to open Developer Tools
- Step 2: Click the Console tab
- Step 3: Paste this script and press Enter:

<pre>

(async () => {
    const allUrls = [];
    for (let page = 1; page <= 2; page++) {
        const r = await fetch(`/wp-json/wp/v2/posts?per_page=100&page=${page}&status=publish`);
        const posts = await r.json();
        if (!posts.length) break;
        posts.forEach(p => allUrls.push(p.link));
    }
    console.log(`Found ${allUrls.length} posts:`);
    console.log(allUrls.join('\n'));
    navigator.clipboard.writeText(allUrls.join('\n'));
    alert(`✅ ${allUrls.length} URLs copied to clipboard!`);
})();

    </pre>

- Step 4: All 151 URLs will be copied to your clipboard!
- Step 5: Go to https://medium.com/p/import and paste one URL at a time to import


If you get notepad permission error

<pre>
Uncaught (in promise) NotAllowedError: Failed to execute 'writeText' on 'Clipboard': Document is not focused.
    at <anonymous>:11:25

</pre>


Then run the following script in the browser 

<pre>

(async () => {
    const allUrls = [];
    for (let page = 1; page <= 2; page++) {
        const r = await fetch(`/wp-json/wp/v2/posts?per_page=100&page=${page}&status=publish`);
        const posts = await r.json();
        if (!posts.length) break;
        posts.forEach(p => allUrls.push(p.link));
    }
    console.log(`Found ${allUrls.length} posts:\n\n` + allUrls.join('\n'));
})();

   
</pre>


after it runs, just type this to copy:

<pre>javascriptcopy(allUrls.join('\n')) </pre>



## If you are logged into the Wordpress, you can also run following APIs as admin to grab the list of all posts

https://netjoints.com/wp-json/wp/v2/posts?per_page=100&page=1

https://netjoints.com/wp-json/wp/v2/posts?per_page=100&page=2

