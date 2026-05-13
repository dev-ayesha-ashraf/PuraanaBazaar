-- Add realistic reviews with diverse ratings and comments
-- This assumes there are existing users and orders in the database

INSERT INTO reviews (order_id, listing_id, buyer_id, seller_id, rating, comment, created_at)
SELECT 
  o.id,
  o.listing_id,
  o.buyer_id,
  o.seller_id,
  CASE 
    WHEN o.amount > 150000 THEN 5  -- Premium items get 5 stars
    WHEN o.amount > 80000 THEN (FLOOR(RANDOM() * 2 + 4)::int)  -- Expensive items get 4-5 stars
    WHEN o.amount > 30000 THEN (FLOOR(RANDOM() * 2 + 3)::int)  -- Mid-range items get 3-4 stars
    ELSE (FLOOR(RANDOM() * 3 + 3)::int)  -- Budget items get 3-5 stars
  END as rating,
  CASE WHEN RANDOM() > 0.3 THEN (ARRAY[
    'Excellent condition, faster delivery than expected. Highly recommend!',
    'Great seller, item as described. Would buy again!',
    'Perfect! Exactly what I needed. Very satisfied.',
    'Good quality for the price. Smooth transaction.',
    'Seller was very helpful and responsive. Great experience!',
    'Item works perfectly. Packaging was excellent.',
    'Amazing quality! Better than expected. 5/5 would buy from again!',
    'Good product, arrived on time. No complaints.',
    'Seller communicated well throughout the process. Happy with purchase!',
    'Excellent value for money. Very pleased!',
    'Item arrived in perfect condition. Great packaging!',
    'Highly satisfied with this purchase. Seller went above and beyond!',
    'Very impressed with the quality and condition of the item.',
    'Smooth and hassle-free transaction. Recommended!',
    'Genuinely happy with my purchase. Fair pricing too!',
    'Top-notch seller. Items exactly as described.',
    'Great experience from start to finish. Will shop again!',
    'Item is as good as the listing described. Very honest seller.',
    'Quick delivery and excellent customer service!',
    'Could not be happier with this purchase. Thank you!'
  ])[FLOOR(RANDOM() * 20 + 1)::int] ELSE NULL END as comment,
  NOW() - (FLOOR(RANDOM() * 60) || ' days')::interval as created_at
FROM orders o
WHERE o.status = 'delivered'
  AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.order_id = o.id)
  AND o.seller_id IS NOT NULL
LIMIT 50;
