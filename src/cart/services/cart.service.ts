import { Injectable } from '@nestjs/common';

import { v4 } from 'uuid';
import { Client } from 'pg';

import { Cart } from '../models';

const dbProps = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

@Injectable()
export class CartService {
  private userCarts: Record<string, Cart> = {};

  async findByUserId(userId: string): Promise<Cart> {
    const client = new Client(dbProps);
    await client.connect();

    try{
      const result = await client.query(`
        SELECT *
        FROM carts as c
        LEFT JOIN cart_items AS ci on c.id = ci.cart_id
        WHERE c.user_id = '${userId}';
      `);

      const cartItems = result.rows;

      const cart: Cart = {
        id: cartItems[0].id,
        items: cartItems.map(x => ({
          product: {
            id: x.product_id,
            title: 'UNDEFINED',
            description: 'UNDEFINED',
            price: 0,
          },
          count: x.count,
        }))
      }
      return cart;
    } catch (error){
      console.error('error', error);
    } finally {
      client.end();
    }
  }

  createByUserId(userId: string) {
    const id = v4(v4());
    const userCart = {
      id,
      items: [],
    };

    this.userCarts[ userId ] = userCart;

    return userCart;
  }

  async findOrCreateByUserId(userId: string): Promise<Cart> {
    const userCart = await this.findByUserId(userId);

    if (userCart) {
      return userCart;
    }

    return this.createByUserId(userId);
  }

  async updateByUserId(userId: string, cart: Cart): Promise<Cart> {
    const client = new Client(dbProps);

    await client.connect();

    try {
      for await (const cartItem of cart.items){
        await client.query(`
          UPDATE cart_items
          SET count=${cartItem.count}
          WHERE product_id = '${cartItem.product.id}' AND cart_id = '${cart.id}';
        `)
      }

      return cart;
    } catch (error) {
      console.error('error', error);
    } finally {
      client.end();
    }
  }

  removeByUserId(userId): void {
    this.userCarts[ userId ] = null;
  }

}
