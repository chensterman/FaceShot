import os
import sys
import json
import argparse
from typing import Dict, List, Any, Optional

# Import functions from other modules
from pimeyes_api import img_to_urls
from url_scraper import batch_scrape
from llm_aggregate import aggregate_person_info

def process_image(image_path: str, delay: float = 0.1, verbose: bool = False) -> Optional[Dict[str, Any]]:
    """
    Process an image through the complete pipeline:
    1. Extract URLs from Pimeyes using the image
    2. Scrape content from those URLs
    3. Aggregate person information from scraped content
    
    Args:
        image_path (str): Path to the image file
        delay (float): Delay between URL scraping requests
        verbose (bool): Whether to print detailed progress information
        
    Returns:
        Dictionary with structured information about the person or None if processing failed
    """
    # Validate image path
    if not os.path.exists(image_path):
        print(f"Error: Image file '{image_path}' does not exist.")
        return None
        
    # Step 1: Get URLs from Pimeyes using the image
    if verbose:
        print(f"\n=== Processing image: {image_path} ===")
    
    pimeyes_results = img_to_urls(image_path)
    
    if not pimeyes_results:
        print("Error: Failed to get results from Pimeyes.")
        return None
        
    # Extract URLs from Pimeyes results
    urls = []
    try:
        for result in pimeyes_results:
            url = result.get('sourceUrl')
            if url and url not in urls:
                urls.append(url)
                
        if verbose:
            print(f"\n=== Found {len(urls)} unique URLs ===")
            for i, url in enumerate(urls[:10]):
                print(f"{i+1}. {url}")
            if len(urls) > 10:
                print(f"...and {len(urls) - 10} more")
    except Exception as e:
        print(f"Error extracting URLs from Pimeyes results: {e}")
        return None
        
    if not urls:
        print("No URLs found in Pimeyes results.")
        return None
        
    # Step 2: Scrape content from the URLs
    if verbose:
        print(f"\n=== Scraping {len(urls)} URLs ===")
        
    scraped_results = batch_scrape(pimeyes_results, delay=delay)
    
    successful_scrapes = [result for result in scraped_results if result.get('success')]
    if verbose:
        print(f"Successfully scraped {len(successful_scrapes)}/{len(urls)} URLs")
        
    if not successful_scrapes:
        print("No successful URL scrapes.")
        return None
        
    # Step 3: Aggregate person information from scraped content
    if verbose:
        print("\n=== Aggregating person information ===")
        
    person_info = aggregate_person_info(successful_scrapes)
    
    if not person_info:
        print("Failed to aggregate person information.")
        return None
        
    # Add the original URLs to the result
    person_info['source_urls'] = [result.get('url') for result in successful_scrapes]
    person_info['image_path'] = image_path
    
    return person_info

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Process an image through Pimeyes and extract person information')
    parser.add_argument('image_path', help='Path to the image file')
    parser.add_argument('--output', '-o', help='Output JSON file path')
    parser.add_argument('--delay', '-d', type=float, default=0.1, help='Delay between URL scraping requests (default: 0.1)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Print detailed progress information')
    
    args = parser.parse_args()
    
    # Process the image
    result = process_image(args.image_path, delay=args.delay, verbose=args.verbose)
    
    if result:
        # Print the result
        print("\n=== Person Information ===")
        print(f"Name: {result.get('name', 'Unknown')}")
        print(f"Description: {result.get('description', 'Unknown')}")
        print(f"Source URLs: {len(result.get('source_urls', []))}")
        
        # Save to output file if specified
        if args.output:
            try:
                with open(args.output, 'w') as f:
                    json.dump(result, f, indent=2)
                print(f"\nResults saved to {args.output}")
            except Exception as e:
                print(f"Error saving results to file: {e}")
    else:
        print("\nFailed to process image.")
        sys.exit(1)

if __name__ == "__main__":
    main()